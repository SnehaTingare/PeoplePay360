'use strict';

const SalaryStructure = require('./salaryStructure.model');
const SalaryRule = require('./salaryRule.model');
const validation = require('./salaryConfig.validation');
const formulas = require('./formula.service');
const AppError = require('../../core/errors/AppError');
const persistenceError = require('../../core/errors/persistenceError');
const paginate = require('../../core/http/pagination');
const { search } = require('../../core/http/validation');

// Reference callbacks are exported service contracts supplied by the owning modules.
// They receive the transaction session, must return a boolean, and must check live
// references AND historical snapshots. Writers must coordinate on the structure
// document in the same transaction when adding references/configuration.
function createSalaryConfigService({ Structure = SalaryStructure, Rule = SalaryRule,
  transaction = work => Structure.db.transaction(work), references = {} } = {}) {
  async function getStructure(id, session) {
    validation.id(id);
    const record = await Structure.findById(id).session(session || null);
    if (!record) throw new AppError('RESOURCE_NOT_FOUND', 'Salary Structure not found.', 404);
    return record;
  }

  async function getRule(id, session) {
    validation.id(id);
    const record = await Rule.findById(id).session(session || null);
    if (!record) throw new AppError('RESOURCE_NOT_FOUND', 'Salary Rule not found.', 404);
    return record;
  }

  async function lockStructure(id, session) {
    const record = await Structure.findOneAndUpdate({ _id: id }, { $inc: { __v: 1 } }, { new: true, session });
    if (!record) throw new AppError('RESOURCE_NOT_FOUND', 'Salary Structure not found.', 404);
    return record;
  }

  async function checkReferences(method, id, session) {
    if (typeof references[method] !== 'function') {
      throw new AppError('DEPENDENCY_UNAVAILABLE', 'Reference checks must be connected before deletion.', 503);
    }
    const referenced = await references[method](id, { session });
    if (typeof referenced !== 'boolean') throw new AppError('DEPENDENCY_UNAVAILABLE', 'Reference check did not return a result.', 503);
    if (referenced) throw new AppError('RESOURCE_CONFLICT', 'Resource is referenced; deactivate it instead.', 409);
  }

  async function listStructures(query) {
    const options = validation.listStructures(query);
    const filter = {};
    if (options.active !== undefined) filter.active = options.active;
    if (options.q) filter.$or = [{ name: search(options.q) }, { code: search(options.q) }];
    return paginate(Structure, filter, options, { name: 1, _id: 1 });
  }

  async function createStructure(body) {
    const input = validation.structureInput(body);
    try { return await Structure.create(input); }
    catch (error) { throw persistenceError(error, 'STR-002'); }
  }

  async function updateStructure(id, body) {
    const input = validation.structureInput(body, true);
    const record = await getStructure(id);
    record.set(input);
    try { return await record.save(); }
    catch (error) { throw persistenceError(error, 'STR-002'); }
  }

  async function setStructureActive(id, active) {
    const record = await getStructure(id);
    record.active = active;
    try { return await record.save(); }
    catch (error) { throw persistenceError(error, 'STR-002'); }
  }

  async function deleteStructure(id) {
    validation.id(id);
    return transaction(async session => {
      await lockStructure(id, session);
      await checkReferences('hasStructureReferences', id, session);
      // Do not orphan child rules or silently cascade through historical rule references.
      if (await Rule.exists({ salaryStructure: id }).session(session)) {
        throw new AppError('RESOURCE_CONFLICT', 'Remove unreferenced rules before deleting this structure.', 409);
      }
      await Structure.deleteOne({ _id: id }, { session });
      return { id };
    });
  }

  async function listRules(query) {
    const options = validation.listRules(query);
    const filter = {};
    if (options.salaryStructureId) {
      await getStructure(options.salaryStructureId);
      filter.salaryStructure = options.salaryStructureId;
    }
    for (const key of ['category', 'active']) if (options[key] !== undefined) filter[key] = options[key];
    return paginate(Rule, filter, options, { sequence: 1, code: 1, _id: 1 });
  }

  async function rulesFor(id, session) {
    return Rule.find({ salaryStructure: id }).session(session || null).lean();
  }

  async function createRule(body) {
    const input = validation.ruleInput(body);
    const { salaryStructureId, ...values } = input;
    try {
      return await transaction(async session => {
        await lockStructure(salaryStructureId, session);
        const candidate = { ...values, salaryStructure: salaryStructureId, active: true };
        const existing = await rulesFor(salaryStructureId, session);
        formulas.validateDependencies([...existing, candidate]);
        const [record] = await Rule.create([candidate], { session });
        return record;
      });
    } catch (error) { throw persistenceError(error, 'SAL-001'); }
  }

  async function mutateRule(id, input, action) {
    validation.id(id);
    try {
      return await transaction(async session => {
        const record = await getRule(id, session);
        const originalStructure = String(record.salaryStructure);
        const targetStructure = input.salaryStructureId || originalStructure;
        for (const structureId of [...new Set([originalStructure, targetStructure])].sort()) await lockStructure(structureId, session);
        if (action === 'delete') await checkReferences('hasRuleReferences', id, session);
        const changes = { ...input };
        delete changes.salaryStructureId;
        const candidate = { ...record.toObject(), ...changes, salaryStructure: targetStructure };
        if (input.calculationType && input.calculationType !== record.calculationType) {
          for (const key of ['fixedAmount', 'percentage', 'percentageBase', 'formula']) {
            if (!(key in changes)) candidate[key] = undefined;
          }
        }
        if (action !== 'delete') validation.completeRule(candidate);
        for (const structureId of new Set([originalStructure, targetStructure])) {
          const others = (await rulesFor(structureId, session)).filter(rule => String(rule._id) !== String(record._id));
          if (action !== 'delete' && structureId === targetStructure) others.push(candidate);
          formulas.validateDependencies(others);
        }
        if (action === 'delete') {
          await Rule.deleteOne({ _id: id }, { session });
          return { id };
        }
        record.set(candidate);
        return await record.save({ session });
      });
    } catch (error) { throw persistenceError(error, 'SAL-001'); }
  }

  const updateRule = (id, body) => mutateRule(id, validation.ruleInput(body, true), 'update');
  const activateRule = id => mutateRule(id, { active: true }, 'activate');
  const deactivateRule = id => mutateRule(id, { active: false }, 'deactivate');
  const deleteRule = id => mutateRule(id, {}, 'delete');

  async function getOrderedActiveRules(id) {
    const structure = await getStructure(id);
    if (!structure.active) throw new AppError('STR-003', 'Salary Structure is inactive.', 422);
    const rules = (await rulesFor(id)).filter(rule => rule.active);
    if (!rules.length) throw new AppError('STR-004', 'Salary Structure has no active rules.', 422, 'BLOCKING');
    return formulas.validateDependencies(rules);
  }

  async function validateDependencies(id) {
    await getStructure(id);
    return formulas.validateDependencies(await rulesFor(id));
  }

  return { listStructures, createStructure, getStructure, updateStructure,
    activateStructure: id => setStructureActive(id, true),
    deactivateStructure: id => setStructureActive(id, false), deleteStructure,
    listRules, createRule, getRule, updateRule, activateRule, deactivateRule, deleteRule,
    getOrderedActiveRules, validateDependencies, calculateRules: formulas.calculateRules };
}

module.exports = { createSalaryConfigService, ...createSalaryConfigService() };
