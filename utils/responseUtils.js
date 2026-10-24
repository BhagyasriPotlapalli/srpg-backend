/**
 * Format a Mongoose document or plain object to standard API response shape
 * Replaces `_id` with `id` and removes `__v`, `password`
 */
export const formatDoc = (doc) => {
  if (!doc) return doc;
  const obj = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };

  if (obj._id) {
    obj.id = obj._id.toString();
    delete obj._id;
  }
  delete obj.__v;
  delete obj.password;

  return obj;
};

/**
 * Standard Success Response Helper
 */
export const successResponse = (res, statusCode = 200, message, data = null) => {
  const payload = {
    status: "success",
    message,
  };
  if (data !== null) {
    payload.data = data;
  }
  return res.status(statusCode).json(payload);
};

/**
 * Standard Error Response Helper
 */
export const errorResponse = (res, statusCode = 400, message) => {
  return res.status(statusCode).json({
    status: "error",
    message,
  });
};
