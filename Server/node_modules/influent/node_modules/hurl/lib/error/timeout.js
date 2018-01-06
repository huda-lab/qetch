var HttpError = require("../error").HttpError,
    TimeoutHttpError;

/**
 * TimeoutHttpError
 *
 * @class TimeoutHttpError
 * @extends HttpError
 */
TimeoutHttpError = HttpError.extend(
    /**
     * @lends TimeoutError.prototype
     */
    {

    }
);

exports.TimeoutHttpError = TimeoutHttpError;
