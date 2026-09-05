'use strict';

const mongoose = require('mongoose');
const AppError = require('../../core/errors/AppError');

const CREATE_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'departmentId',
  'jobPosition',
  'managerId',
  'employeeType',
  'workingScheduleId',
  'joiningDate',
  'bankDetails',
];

const EMPLOYEE_TYPES = [
  'FULL_TIME',
  'CONTRACT',
];

const JOB_POSITIONS = [
  'Software Engineer',
  'HR Executive',
  'Payroll Executive',
  'Accountant',
  'Sales Executive',
  'Operations Executive',
  'Manager',
];

const fail = (
  code,
  field,
  message,
  statusCode = 400,
) => {
  throw new AppError(
    code,
    message,
    statusCode,
    'ERROR',
    { field },
  );
};

const object = (
  value,
  field = 'body',
) => {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    fail(
      'VALIDATION_ERROR',
      field,
      `${field} must be an object.`,
    );
  }
};

const allowed = (value, fields) => {
  const unknown = Object.keys(value).find(
    (key) => !fields.includes(key),
  );

  if (unknown) {
    fail(
      'VALIDATION_ERROR',
      unknown,
      'Unexpected request field.',
    );
  }
};

const text = (
  value,
  field,
  code = 'VALIDATION_ERROR',
  max = 200,
) => {
  if (typeof value !== 'string') {
    fail(
      code,
      field,
      `${field} is required.`,
    );
  }

  const normalized = value.trim();

  if (
    !normalized ||
    normalized.length > max
  ) {
    fail(
      code,
      field,
      `${field} is required and must be at most ${max} characters.`,
    );
  }

  return normalized;
};

const humanName = (
  value,
  field,
) => {
  const normalized = text(
    value,
    field,
    'VALIDATION_ERROR',
    80,
  );

  if (
    !/^[\p{L}][\p{L}\s'-]*$/u.test(
      normalized,
    )
  ) {
    fail(
      'VALIDATION_ERROR',
      field,
      `${field} contains invalid characters.`,
    );
  }

  return normalized;
};

const reference = (
  value,
  field,
  optional = false,
) => {
  if (
    optional &&
    (value === null ||
      value === undefined ||
      value === '')
  ) {
    return null;
  }

  if (
    typeof value !== 'string' ||
    !mongoose.isObjectIdOrHexString(value)
  ) {
    fail(
      'VALIDATION_ERROR',
      field,
      `${field} must be a valid identifier.`,
    );
  }

  return value;
};

const email = (value) => {
  const normalized = text(
    value,
    'email',
    'VALIDATION_ERROR',
    254,
  ).toLowerCase();

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      normalized,
    )
  ) {
    fail(
      'VALIDATION_ERROR',
      'email',
      'A valid email is required.',
    );
  }

  return normalized;
};

const phone = (value) => {
  const normalized = text(
    value,
    'phone',
    'VALIDATION_ERROR',
    10,
  );

  if (!/^\d{10}$/.test(normalized)) {
    fail(
      'VALIDATION_ERROR',
      'phone',
      'Phone number must contain exactly 10 digits.',
    );
  }

  return normalized;
};

const employeeType = (value) => {
  const normalized = text(
    value,
    'employeeType',
  ).toUpperCase();

  if (
    !EMPLOYEE_TYPES.includes(normalized)
  ) {
    fail(
      'VALIDATION_ERROR',
      'employeeType',
      'Invalid employee type.',
    );
  }

  return normalized;
};

const jobPosition = (value) => {
  const normalized = text(
    value,
    'jobPosition',
    'EMP-003',
    120,
  );

  if (
    !JOB_POSITIONS.includes(normalized)
  ) {
    fail(
      'EMP-003',
      'jobPosition',
      'Invalid job position.',
      422,
    );
  }

  return normalized;
};

const today = () => {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
};

const dateOnly = (value) => {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    fail(
      'VALIDATION_ERROR',
      'joiningDate',
      'joiningDate must use YYYY-MM-DD.',
    );
  }

  const date = new Date(
    `${value}T00:00:00.000Z`,
  );

  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !==
      value
  ) {
    fail(
      'VALIDATION_ERROR',
      'joiningDate',
      'Invalid joiningDate.',
    );
  }

  if (value > today()) {
    fail(
      'VALIDATION_ERROR',
      'joiningDate',
      'joiningDate cannot be in the future.',
    );
  }

  return date;
};

const bankDetails = (value) => {
  if (value === null) {
    return null;
  }

  object(value, 'bankDetails');

  allowed(value, [
    'accountHolderName',
    'accountNumber',
    'bankName',
    'ifscCode',
  ]);

  const accountHolderName = text(
    value.accountHolderName,
    'bankDetails.accountHolderName',
    'VALIDATION_ERROR',
    120,
  );

  if (
    !/^[\p{L}][\p{L}\s'.-]*$/u.test(
      accountHolderName,
    )
  ) {
    fail(
      'VALIDATION_ERROR',
      'bankDetails.accountHolderName',
      'Invalid account holder name.',
    );
  }

  const accountNumber = text(
    value.accountNumber,
    'bankDetails.accountNumber',
    'VALIDATION_ERROR',
    18,
  );

  if (
    !/^\d{9,18}$/.test(accountNumber)
  ) {
    fail(
      'VALIDATION_ERROR',
      'bankDetails.accountNumber',
      'Account number must contain 9 to 18 digits.',
    );
  }

  const bankName = text(
    value.bankName,
    'bankDetails.bankName',
    'VALIDATION_ERROR',
    120,
  );

  const ifscCode = text(
    value.ifscCode,
    'bankDetails.ifscCode',
    'VALIDATION_ERROR',
    11,
  ).toUpperCase();

  if (
    !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(
      ifscCode,
    )
  ) {
    fail(
      'VALIDATION_ERROR',
      'bankDetails.ifscCode',
      'Invalid Indian IFSC code.',
    );
  }

  return {
    accountHolderName,
    accountNumber,
    bankName,
    ifscCode,
  };
};

const positiveInteger = (
  value,
  fallback,
  field,
  max = Number.MAX_SAFE_INTEGER,
) => {
  if (value === undefined) {
    return fallback;
  }

  if (
    !/^\d+$/.test(String(value)) ||
    Number(value) < 1 ||
    Number(value) > max
  ) {
    fail(
      'VALIDATION_ERROR',
      field,
      `Invalid ${field}.`,
    );
  }

  return Number(value);
};

function validateId({ params }) {
  if (
    !mongoose.isObjectIdOrHexString(
      params.id,
    )
  ) {
    fail(
      'VALIDATION_ERROR',
      'id',
      'id must be a valid identifier.',
    );
  }

  return {
    params: {
      id: params.id,
    },
  };
}

function validateList({ query }) {
  allowed(query, [
    'q',
    'departmentId',
    'employeeType',
    'employmentStatus',
    'managerId',
    'page',
    'limit',
  ]);

  const result = {
    page: positiveInteger(
      query.page,
      1,
      'page',
    ),

    limit: positiveInteger(
      query.limit,
      20,
      'limit',
      100,
    ),
  };

  if (query.q !== undefined) {
    result.q = text(
      query.q,
      'q',
      'VALIDATION_ERROR',
      200,
    );
  }

  for (const field of [
    'departmentId',
    'managerId',
  ]) {
    if (query[field] !== undefined) {
      result[field] = reference(
        query[field],
        field,
      );
    }
  }

  if (
    query.employeeType !== undefined
  ) {
    result.employeeType =
      employeeType(query.employeeType);
  }

  if (
    query.employmentStatus !== undefined
  ) {
    if (
      !['ACTIVE', 'INACTIVE'].includes(
        query.employmentStatus,
      )
    ) {
      fail(
        'VALIDATION_ERROR',
        'employmentStatus',
        'Invalid employmentStatus.',
      );
    }

    result.employmentStatus =
      query.employmentStatus;
  }

  return {
    query: result,
  };
}

function values(body, partial) {
  object(body);

  allowed(body, CREATE_FIELDS);

  if (
    partial &&
    !Object.keys(body).length
  ) {
    fail(
      'VALIDATION_ERROR',
      'body',
      'Provide at least one field.',
    );
  }

  if (
    !partial &&
    (!body.departmentId ||
      !body.jobPosition)
  ) {
    fail(
      'EMP-003',
      !body.departmentId
        ? 'departmentId'
        : 'jobPosition',
      'Department and jobPosition are required.',
      422,
    );
  }

  const result = {};

  if (
    !partial ||
    body.firstName !== undefined
  ) {
    result.firstName = humanName(
      body.firstName,
      'firstName',
    );
  }

  if (
    !partial ||
    body.lastName !== undefined
  ) {
    result.lastName = humanName(
      body.lastName,
      'lastName',
    );
  }

  if (
    !partial ||
    body.email !== undefined
  ) {
    result.email = email(body.email);
  }

  if (
    !partial ||
    body.phone !== undefined
  ) {
    result.phone = phone(body.phone);
  }

  if (
    !partial ||
    body.departmentId !== undefined
  ) {
    result.departmentId = reference(
      body.departmentId,
      'departmentId',
    );
  }

  if (
    !partial ||
    body.jobPosition !== undefined
  ) {
    result.jobPosition = jobPosition(
      body.jobPosition,
    );
  }

  if (
    !partial ||
    body.employeeType !== undefined
  ) {
    result.employeeType = employeeType(
      body.employeeType,
    );
  }

  if (
    !partial ||
    body.workingScheduleId !==
      undefined
  ) {
    result.workingScheduleId =
      reference(
        body.workingScheduleId,
        'workingScheduleId',
      );
  }

  if (
    !partial ||
    body.joiningDate !== undefined
  ) {
    result.joiningDate = dateOnly(
      body.joiningDate,
    );
  }

  if (body.managerId !== undefined) {
    result.managerId = reference(
      body.managerId,
      'managerId',
      true,
    );
  }

  if (
    body.bankDetails !== undefined
  ) {
    result.bankDetails = bankDetails(
      body.bankDetails,
    );
  }

  return result;
}

const validateCreate = ({ body }) => ({
  body: values(body, false),
});

function validateUpdate({
  body,
  params,
}) {
  validateId({ params });

  return {
    params: {
      id: params.id,
    },

    body: values(body, true),
  };
}

module.exports = {
  validateId,
  validateList,
  validateCreate,
  validateUpdate,
};