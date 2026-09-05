'use strict';

module.exports = (validate) => (req, res, next) => {
  try {
    validate(req);
    next();
  } catch (error) {
    next(error);
  }
};
