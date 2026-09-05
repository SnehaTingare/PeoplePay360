'use strict';

const mongoose = require('mongoose');
const Contract = require('./contract.model');
const { CONTRACT_STATUSES } = Contract;
const employeeService = require('../employees/employee.service');
const departmentService = require('../departments/department.service');
const scheduleService = require('../schedules/schedule.service');
const salaryConfigService = require('../salaryConfig/salaryConfig.service');
const AppError = require('../../core/errors/AppError');
const errors = require('../../core/errors/errorCodes');
const paginate = require('../../core/http/pagination');
const { createContractResolutionService } = require('./contractResolution.service');

const domainError = (definition, severity = 'ERROR', details = {}) => new AppError(
  definition.code, definition.message, definition.statusCode, severity, details,
);

const stateConflict = message => new AppError('RESOURCE_CONFLICT', message, 409);

const mapInput = input => {
  const changes = { ...input };
  const references = {
    employeeId: 'employee',
    departmentId: 'department',
    workingScheduleId: 'workingSchedule',
    salaryStructureId: 'salaryStructure',
  };
  for (const [source, target] of Object.entries(references)) {
    if (Object.hasOwn(changes, source)) {
      changes[target] = changes[source];
      delete changes[source];
    }
  }
  return changes;
};

function createContractService({
  Model = Contract,
  employees = employeeService,
  departments = departmentService,
  schedules = scheduleService,
  salaryConfig = salaryConfigService,
  resolution,
  hasHistoricalPayrollReferences = async () => false,
  now = () => new Date(),
} = {}) {
  const resolver = resolution || createContractResolutionService({ Model });

  async function getContract(id) {
    if (!mongoose.isObjectIdOrHexString(id)) throw new AppError('RESOURCE_NOT_FOUND', 'Contract not found.', 404);
    const contract = await Model.findById(id);
    if (!contract) throw new AppError('RESOURCE_NOT_FOUND', 'Contract not found.', 404);
    return contract;
  }

  function validateTerms(contract) {
    const startDate = new Date(contract.startDate);
    const endDate = contract.endDate === null || contract.endDate === undefined ? null : new Date(contract.endDate);
    if (!Number.isFinite(startDate.getTime()) || (endDate && !Number.isFinite(endDate.getTime())) || (endDate && startDate > endDate)) {
      throw domainError(errors.CONTRACT_INVALID_DATES);
    }
    if (contract.wage === null || contract.wage === undefined) throw domainError(errors.CONTRACT_WAGE_MISSING);
    if (!Number.isFinite(Number(contract.wage)) || Number(contract.wage) < 0) throw domainError(errors.CONTRACT_NEGATIVE_WAGE);
    if (!contract.salaryStructure) throw domainError(errors.CONTRACT_STRUCTURE_MISSING);
  }

  async function validateReferences(contract) {
    await Promise.all([
      employees.getEmployee(contract.employee),
      departments.getDepartment(contract.department),
      schedules.getSchedule(contract.workingSchedule),
      salaryConfig.getStructure(contract.salaryStructure),
    ]);
  }

  async function validateCompleteContract(contract) {
    validateTerms(contract);
    await validateReferences(contract);
  }

  async function listContracts({ employeeId, departmentId, salaryStructureId, status, from, to, page, limit }) {
    const filter = {};
    if (employeeId) filter.employee = employeeId;
    if (departmentId) filter.department = departmentId;
    if (salaryStructureId) filter.salaryStructure = salaryStructureId;
    if (status) filter.status = status;
    if (from) filter.$or = [{ endDate: null }, { endDate: { $gte: from } }];
    if (to) filter.startDate = { $lte: to };
    return paginate(Model, filter, { page, limit }, { startDate: -1, _id: -1 });
  }

  async function createContract(input) {
    const data = { ...mapInput(input), status: CONTRACT_STATUSES.DRAFT };
    await validateCompleteContract(data);
    return Model.create(data);
  }

  async function updateContract(id, input) {
    const contract = await getContract(id);
    if (contract.status !== CONTRACT_STATUSES.DRAFT) {
      throw stateConflict('Only Draft Contracts can be updated.');
    }
    const changes = mapInput(input);
    const candidate = { ...contract.toObject(), ...changes };
    await validateCompleteContract(candidate);
    contract.set(changes);
    return contract.save();
  }

  async function startContract(id) {
    const contract = await getContract(id);
    if (contract.status !== CONTRACT_STATUSES.DRAFT) {
      throw stateConflict('Only a Draft Contract can be started.');
    }
    await validateCompleteContract(contract);
    const overlaps = await resolver.findOverlappingApplicableContracts({
      employeeId: contract.employee,
      startDate: contract.startDate,
      endDate: contract.endDate,
      excludeContractId: contract._id,
    });
    if (overlaps.length) {
      throw domainError(errors.CONTRACT_OVERLAP, 'BLOCKING', {
        employeeId: String(contract.employee),
        conflictingContractIds: overlaps.map(overlap => String(overlap._id)),
      });
    }
    contract.status = CONTRACT_STATUSES.RUNNING;
    return contract.save();
  }

  async function cancelContract(id) {
    const contract = await getContract(id);
    if (![CONTRACT_STATUSES.DRAFT, CONTRACT_STATUSES.RUNNING].includes(contract.status)) {
      throw stateConflict('Only a Draft or Running Contract can be cancelled.');
    }
    contract.status = CONTRACT_STATUSES.CANCELLED;
    return contract.save();
  }

  async function expireContract(id) {
    const contract = await getContract(id);
    if (contract.status !== CONTRACT_STATUSES.RUNNING) {
      throw stateConflict('Only a Running Contract can be expired.');
    }
    const today = now();
    today.setUTCHours(0, 0, 0, 0);
    if (!contract.endDate || new Date(contract.endDate) >= today) {
      throw stateConflict('A Contract can be expired only after its end date has passed.');
    }
    contract.status = CONTRACT_STATUSES.EXPIRED;
    return contract.save();
  }

  async function deleteContract(id) {
    const contract = await getContract(id);
    if (contract.status !== CONTRACT_STATUSES.DRAFT) {
      throw stateConflict('Only a Draft Contract can be deleted.');
    }
    if (await hasHistoricalPayrollReferences(contract._id)) {
      throw stateConflict('Contract is referenced by historical payroll and cannot be deleted.');
    }
    await Model.deleteOne({ _id: contract._id });
    return { deleted: true };
  }

  return {
    listContracts,
    createContract,
    getContract,
    updateContract,
    startContract,
    cancelContract,
    expireContract,
    deleteContract,
    resolveApplicableContract: resolver.resolveApplicableContract,
    findApplicableContracts: resolver.findApplicableContracts,
    findOverlaps: resolver.findOverlappingApplicableContracts,
    listEmployeeContracts: (employeeId, options = {}) => listContracts({
      ...options,
      employeeId,
      page: options.page || 1,
      limit: options.limit || 20,
    }),
  };
}

module.exports = { createContractService, ...createContractService() };
