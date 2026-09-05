'use strict';

exports.resource = (res, data, status = 200) => res.status(status).json({ data });
exports.collection = (res, result) => res.json(result);
