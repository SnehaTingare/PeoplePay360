'use strict';

// In-memory persistence adapter for service tests. MongoDB behavior (indexes,
// transaction isolation) still requires a database integration environment.
function createStore() {
  let nextId = 1;
  const stores = [];
  const matches = (row, filter) => Object.entries(filter).every(([key, value]) => {
    if (key === '$or') return value.some(clause => matches(row, clause));
    if (value instanceof RegExp) return value.test(row[key]);
    return String(row[key]) === String(value);
  });

  function model(unique) {
    const rows = new Map();
    stores.push(rows);
    function duplicate(candidate) {
      for (const row of rows.values()) {
        if (row._id !== candidate._id && unique.every(key => row[key] === candidate[key])) {
          const error = new Error('duplicate'); error.code = 11000; throw error;
        }
      }
    }
    function document(row) {
      if (!row) return null;
      return {
        ...structuredClone(row),
        set(values) { Object.assign(this, values); },
        toObject() { return Object.fromEntries(Object.entries(this).filter(([, value]) => typeof value !== 'function')); },
        async save() { const value = this.toObject(); duplicate(value); rows.set(value._id, structuredClone(value)); return this; },
      };
    }
    function query(work) {
      let sort;
      let skip = 0;
      let limit = Infinity;
      let lean = false;
      return {
        session() { return this; },
        sort(value) { sort = value; return this; },
        skip(value) { skip = value; return this; },
        limit(value) { limit = value; return this; },
        lean() { lean = true; return this; },
        then(resolve, reject) {
          return Promise.resolve().then(work).then(value => {
            if (Array.isArray(value)) {
              if (sort) value.sort((a, b) => {
                for (const [key, direction] of Object.entries(sort)) {
                  if (a[key] !== b[key]) return (a[key] < b[key] ? -1 : 1) * direction;
                }
                return 0;
              });
              return value.slice(skip, skip + limit).map(row => lean ? structuredClone(row) : document(row));
            }
            return value;
          }).then(resolve, reject);
        },
      };
    }
    return {
      rows,
      async create(input) {
        if (Array.isArray(input)) return Promise.all(input.map(row => this.create(row)));
        const row = { active: true, _id: (nextId++).toString(16).padStart(24, '0'), ...input };
        duplicate(row); rows.set(row._id, structuredClone(row)); return document(row);
      },
      find(filter) { return query(() => [...rows.values()].filter(row => matches(row, filter))); },
      findOne(filter) { return query(() => document([...rows.values()].find(row => matches(row, filter)))); },
      findById(id) { return query(() => document(rows.get(id))); },
      exists(filter) { return query(() => [...rows.values()].some(row => matches(row, filter))); },
      async countDocuments(filter) { return [...rows.values()].filter(row => matches(row, filter)).length; },
      async findOneAndUpdate(filter) { return document([...rows.values()].find(row => matches(row, filter))); },
      async deleteOne(filter) { for (const [id, row] of rows) if (matches(row, filter)) rows.delete(id); },
    };
  }
  async function transaction(work) {
    const snapshots = stores.map(rows => structuredClone(rows));
    try { return await work({ testSession: true }); }
    catch (error) {
      stores.forEach((rows, i) => { rows.clear(); for (const [id, row] of snapshots[i]) rows.set(id, row); });
      throw error;
    }
  }
  return { model, transaction };
}
module.exports = createStore;
