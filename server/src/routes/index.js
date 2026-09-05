'use strict';

const { Router } = require('express');
const authenticate = require('../core/middleware/authenticate');
const authRouter = require('../modules/auth/auth.routes');
const userRouter = require('../modules/users/user.routes');
const createSalaryConfigRouter = require('../modules/salaryConfig/salaryConfig.routes');
const createTimeOffRouter = require('../modules/timeOff/timeOff.routes');

const router = Router();
const salaryConfigRouter = createSalaryConfigRouter({ authenticate });
const timeOffRouter = createTimeOffRouter({ authenticate });

const useForPrefix = (prefix, childRouter) => (req, res, next) => {
  if (!req.path.startsWith(prefix)) return next();
  return childRouter(req, res, next);
};

router.get('/health', (req, res) => res.status(200).json({ data: { status: 'ok' } }));
router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use(useForPrefix('/payroll/', salaryConfigRouter));
router.use(useForPrefix('/time-off/', timeOffRouter));

module.exports = router;
