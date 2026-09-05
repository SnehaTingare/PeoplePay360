'use strict';

const mongoose = require('mongoose');
const AppError = require('../../core/errors/AppError');
const errors = require('../../core/errors/errorCodes');
const Contract = require('./contract.model');

const APPLICABLE_STATUSES = Object.freeze([
  'RUNNING',
  'EXPIRED',
]);

const domainError = (
  definition,
  severity = 'ERROR',
  details = {}
) =>
  new AppError(
    definition.code,
    definition.message,
    definition.statusCode,
    severity,
    details
  );

function dateValue(value, field) {
  let parsed;

  if (value instanceof Date) {
    parsed = new Date(value.getTime());
  } else if (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    parsed = new Date(`${value}T00:00:00.000Z`);
  }

  if (
    !parsed ||
    !Number.isFinite(parsed.getTime()) ||
    (
      typeof value === 'string' &&
      parsed.toISOString().slice(0, 10) !== value
    )
  ) {
    throw new AppError(
      'VALIDATION_ERROR',
      `${field} must be a valid date.`,
      422,
      'ERROR',
      { field }
    );
  }

  return parsed;
}

function validatePeriod(periodStart, periodEnd) {
  const start = dateValue(
    periodStart,
    'periodStart'
  );

  const end = dateValue(
    periodEnd,
    'periodEnd'
  );

  if (start > end) {
    throw domainError(
      errors.CONTRACT_INVALID_DATES
    );
  }

  return {
    periodStart: start,
    periodEnd: end,
  };
}

function validateEmployeeId(employeeId) {
  if (
    !mongoose.isObjectIdOrHexString(employeeId)
  ) {
    throw new AppError(
      'VALIDATION_ERROR',
      'employeeId must be a valid identifier.',
      422,
      'ERROR',
      { field: 'employeeId' }
    );
  }
}

/**
 * Contract overlaps a period when:
 *
 * contract.startDate <= periodEnd
 *
 * AND
 *
 * contract.endDate == null
 * OR
 * contract.endDate >= periodStart
 *
 * Dates are inclusive.
 */
function buildPeriodOverlapQuery({
  employeeId,
  startDate,
  endDate,
  statuses = APPLICABLE_STATUSES,
  excludeContractId,
}) {
  const query = {
    employee: employeeId,

    status: {
      $in: statuses,
    },

    $or: [
      {
        endDate: null,
      },
      {
        endDate: {
          $gte: startDate,
        },
      },
    ],
  };

  if (endDate) {
    query.startDate = {
      $lte: endDate,
    };
  }

  if (excludeContractId) {
    query._id = {
      $ne: excludeContractId,
    };
  }

  return query;
}

function createContractResolutionService({
  Model = Contract,
} = {}) {

  /**
   * Find all Contracts applicable to a payroll period.
   *
   * Only:
   * RUNNING
   * EXPIRED
   *
   * are payroll-applicable.
   *
   * DRAFT and CANCELLED never participate in payroll.
   */
  async function findApplicableContracts({
    employeeId,
    periodStart,
    periodEnd,
    session = null,
  }) {
    validateEmployeeId(employeeId);

    const period = validatePeriod(
      periodStart,
      periodEnd
    );

    const query = Model.find(
      buildPeriodOverlapQuery({
        employeeId,

        startDate:
          period.periodStart,

        endDate:
          period.periodEnd,
      })
    );

    if (
      session &&
      typeof query.session === 'function'
    ) {
      query.session(session);
    }

    return query;
  }

  /**
   * Used when starting a Contract.
   *
   * Ensures another payroll-applicable Contract does
   * not overlap the Contract being started.
   */
  async function findOverlappingApplicableContracts({
    employeeId,
    startDate,
    endDate,
    excludeContractId,
    session = null,
  }) {
    validateEmployeeId(employeeId);

    const start = dateValue(
      startDate,
      'startDate'
    );

    const end =
      endDate === null ||
      endDate === undefined
        ? null
        : dateValue(
            endDate,
            'endDate'
          );

    if (
      end &&
      start > end
    ) {
      throw domainError(
        errors.CONTRACT_INVALID_DATES
      );
    }

    const query = Model.find(
      buildPeriodOverlapQuery({
        employeeId,
        startDate: start,
        endDate: end,
        excludeContractId,
      })
    );

    if (
      session &&
      typeof query.session === 'function'
    ) {
      query.session(session);
    }

    return query;
  }

  /**
   * Resolve EXACTLY ONE Contract for payroll.
   *
   * 0 applicable Contracts:
   * blocking payroll error
   *
   * >1 applicable Contracts:
   * blocking payroll ambiguity
   *
   * structure mismatch:
   * blocking payroll error
   */
  async function resolveApplicableContract({
    employeeId,
    periodStart,
    periodEnd,
    salaryStructureId,
    session = null,
  }) {
    const contracts =
      await findApplicableContracts({
        employeeId,
        periodStart,
        periodEnd,
        session,
      });

    if (!contracts.length) {
      throw domainError(
        errors.CONTRACT_NOT_APPLICABLE,
        'BLOCKING',
        {
          employeeId:
            String(employeeId),
        }
      );
    }

    if (contracts.length > 1) {
      throw domainError(
        errors.CONTRACT_OVERLAP,
        'BLOCKING',
        {
          employeeId:
            String(employeeId),

          conflictingContractIds:
            contracts.map(contract =>
              String(contract._id)
            ),
        }
      );
    }

    const contract =
      contracts[0];

    if (
      salaryStructureId &&
      String(contract.salaryStructure) !==
        String(salaryStructureId)
    ) {
      throw domainError(
        errors.CONTRACT_STRUCTURE_MISMATCH,

        // IMPORTANT:
        // mismatch prevents valid payroll computation
        'BLOCKING',

        {
          employeeId:
            String(employeeId),

          contractId:
            String(contract._id),

          contractSalaryStructureId:
            String(
              contract.salaryStructure
            ),

          payrunSalaryStructureId:
            String(
              salaryStructureId
            ),
        }
      );
    }

    return contract;
  }

  return {
    findApplicableContracts,
    findOverlappingApplicableContracts,
    resolveApplicableContract,
  };
}

module.exports = {
  APPLICABLE_STATUSES,
  buildPeriodOverlapQuery,
  createContractResolutionService,
  validatePeriod,

  ...createContractResolutionService(),
};