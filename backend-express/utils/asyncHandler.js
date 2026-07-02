// Wraps an async Express handler so rejected promises are forwarded to next(error)
// instead of every controller repeating its own try/catch { next(error); }.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
