var _            = require("./utils"),
    inherits     = require("inherits-js"),
    assert       = require("assert"),
    debug        = require("debug"),
    EventEmitter = require("events").EventEmitter,
    Http;

/**
 * Http
 *
 * @class Http
 * @extends EventEmitter
 * @abstract
 *
 * @param {Object} [options]
 */
Http = inherits( EventEmitter,
    /**
     * @lends Http.prototype
     */
    {
        constructor: function(options) {
            var self = this;

            EventEmitter.call(this);
            this.options = _.extend({}, this.constructor.DEFAULTS, options);

            // default logger is evented
            this.logger = [
                "debug",
                "info",
                "notice",
                "warning",
                "error",
                "critical",
                "alert",
                "emergency"
            ].reduce(
                function(memo, level) {
                    var logger;

                    logger = debug("hurl:" + level);

                    memo[level] = function() {
                        var args;

                        args = Array.prototype.slice.call(arguments);

                        logger.apply(null, args)
                        self.emit.apply(self, ["log:" + level].concat(args));
                    };

                    return memo;
                },
                {}
            );
        },

        injectUUID: function(uuid) {
            assert(_.isEmpty(this.uuid), "UUID is already set");
            assert(typeof uuid == "function", "UUID is expected to be a function");
            this.uuid = uuid;
        },

        genUUID: function(str) {
            assert(_.isUndefined(str) || _.isString(str), "String is expected");
            return this.uuid ? this.uuid.call(null, str) : _.uniqueId(str);
        },

        /**
         * @abstract
         *
         * @param {string} url
         * @param {Object} [options]
         * @param {Object} [options.query]
         * @param {Object} [options.headers]
         * @param {Object} [options.auth]
         * @param {Object} [options.agent]
         * @param {Object} [options.data]
         * @param {Object} [options.timeout]
         * @param {Object} [options.method]
         *
         * @returns Promise
         */
        request: function(url, options) {
            throw new Error("Method must be implemented");
        }
    },

    /**
     * @lends Http
     */
    {
        extend: function(prots, statics) {
            return inherits(this, prots, statics);
        },

        DEFAULTS: {}
    }
);

exports.Http = Http;
