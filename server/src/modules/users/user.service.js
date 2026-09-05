'use strict';

const mongoose = require('mongoose');
const roles = require('../../core/constants/roles');
const { ACCOUNT_STATUSES } = require('../../core/constants/statuses');
const AppError = require('../../core/errors/AppError');
const errors = require('../../core/errors/errorCodes');
const paginate = require('../../core/http/pagination');
const { generateTemporaryPassword, hashPassword } = require('../../core/security/password');
const User = require('./user.model');

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeEmail = email => email.trim().toLowerCase();
const isCanonicalRole = role => Object.values(roles).includes(role);
const appError = (definition, overrides = {}) => new AppError(
  definition.code,
  overrides.message || definition.message,
  overrides.statusCode || definition.statusCode,
  overrides.severity || 'ERROR',
  overrides.details || {},
);

const serializeUser = user => ({
  id: String(user._id),
  uniqueId: user.uniqueId,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  role: user.role,
  accountStatus: user.accountStatus,
  mustChangePassword: user.mustChangePassword,
  employeeId: user.employeeId ? String(user.employeeId) : null,
});

function assertValidId(id) {
  if (!mongoose.isObjectIdOrHexString(id)) throw appError(errors.RESOURCE_NOT_FOUND);
}

async function findByIdOrThrow(id) {
  assertValidId(id);
  const user = await User.findById(id);
  if (!user) throw appError(errors.RESOURCE_NOT_FOUND);
  return user;
}

const createUniqueId = id => `PP360-U-${id.toHexString().slice(-8).toUpperCase()}`;
const duplicateEmail = error => error && error.code === 11000 && error.keyPattern && error.keyPattern.email;
const findByEmailWithPassword = email => User.findOne({ email: normalizeEmail(email) }).select('+passwordHash');
const findById = id => (mongoose.isObjectIdOrHexString(id) ? User.findById(id) : null);
const findByIdWithPassword = id => (
  mongoose.isObjectIdOrHexString(id) ? User.findById(id).select('+passwordHash') : null
);
const findAdmin = () => User.findOne({ role: roles.ADMIN });

const createBootstrapAdmin = ({ firstName, lastName, email, passwordHash }) => User.findOneAndUpdate(
  { uniqueId: 'PP360-U-000001' },
  { $setOnInsert: {
    uniqueId: 'PP360-U-000001', firstName, lastName, email: normalizeEmail(email), passwordHash,
    role: roles.ADMIN, accountStatus: ACCOUNT_STATUSES.ACTIVE, mustChangePassword: true,
  } },
  { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
);

const updateLastLogin = (id, date = new Date()) => User.findByIdAndUpdate(id, { $set: { lastLogin: date } }, { new: true });
const replaceOwnPassword = (id, passwordHash) => User.findByIdAndUpdate(
  id,
  { $set: { passwordHash, mustChangePassword: false } },
  { new: true, runValidators: true },
);

async function listUsers({ role, accountStatus, q, page, limit }) {
  const filter = {};
  if (role) filter.role = role;
  if (accountStatus) filter.accountStatus = accountStatus;
  if (q) {
    const search = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ firstName: search }, { lastName: search }, { email: search }, { uniqueId: search }];
  }
  const result = await paginate(User, filter, { page, limit }, { createdAt: -1 });
  return { data: result.data.map(serializeUser), meta: result.meta };
}

const getUser = async id => serializeUser(await findByIdOrThrow(id));

async function createUser({ firstName, lastName, email, role, employeeId = null }) {
  if (!isCanonicalRole(role)) throw appError(errors.USER_INVALID_ROLE);
  const normalizedEmail = normalizeEmail(email);
  if (await User.exists({ email: normalizedEmail })) throw appError(errors.USER_DUPLICATE_EMAIL);

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);
  const _id = new mongoose.Types.ObjectId();
  try {
    const user = await User.create({
      _id, uniqueId: createUniqueId(_id), firstName, lastName, email: normalizedEmail, passwordHash,
      role, accountStatus: ACCOUNT_STATUSES.ACTIVE, employeeId, mustChangePassword: true,
    });
    return { user: serializeUser(user), temporaryPassword };
  } catch (error) {
    if (duplicateEmail(error)) throw appError(errors.USER_DUPLICATE_EMAIL);
    throw error;
  }
}

async function updateUser(id, changes) {
  const user = await findByIdOrThrow(id);
  if (changes.email !== undefined) {
    const email = normalizeEmail(changes.email);
    if (await User.exists({ email, _id: { $ne: user._id } })) throw appError(errors.USER_DUPLICATE_EMAIL);
    user.email = email;
  }
  for (const field of ['firstName', 'lastName', 'employeeId']) {
    if (changes[field] !== undefined) user[field] = changes[field];
  }
  try {
    await user.save();
  } catch (error) {
    if (duplicateEmail(error)) throw appError(errors.USER_DUPLICATE_EMAIL);
    throw error;
  }
  return serializeUser(user);
}

async function changeRole(id, role) {
  if (!isCanonicalRole(role)) throw appError(errors.USER_INVALID_ROLE);
  const user = await findByIdOrThrow(id);
  user.role = role;
  await user.save();
  return serializeUser(user);
}

async function setAccountStatus(id, accountStatus) {
  const user = await findByIdOrThrow(id);
  user.accountStatus = accountStatus;
  await user.save();
  return serializeUser(user);
}

async function resetPassword(id) {
  const user = await findByIdOrThrow(id);
  const temporaryPassword = generateTemporaryPassword();
  user.passwordHash = await hashPassword(temporaryPassword);
  user.mustChangePassword = true;
  await user.save();
  return { user: serializeUser(user), temporaryPassword };
}

module.exports = {
  changeRole, createBootstrapAdmin, createUser, findAdmin, findByEmailWithPassword, findById,
  findByIdWithPassword, getUser, listUsers, normalizeEmail, replaceOwnPassword, resetPassword,
  serializeUser, setAccountStatus, updateLastLogin, updateUser,
};
