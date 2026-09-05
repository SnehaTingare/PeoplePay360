'use strict';

module.exports = async function paginate(model, filter, { page, limit }, sort) {
  const [data, total] = await Promise.all([
    model.find(filter).sort(sort).skip((page - 1) * limit).limit(limit),
    model.countDocuments(filter),
  ]);
  return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};
