var HttpError = require("../error").HttpError,
    AuthHttpError;

/**
 * AuthHttpError
 *
 * @class AuthHttpError
 * @extends HttpError
 */
AuthHttpError = HttpError.extend(
    /**
     * @lends AuthHttpError.prototype
     */
    {

    }
);

exports.AuthHttpError = AuthHttpError;
