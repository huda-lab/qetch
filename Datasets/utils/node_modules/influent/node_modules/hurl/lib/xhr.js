var Http      = require("./http").Http,
    _         = require("./utils"),
    HttpError = require("./error").HttpError,
    querystring = require("querystring"),
    TimeoutError = require("./error/timeout").TimeoutHttpError,
    XhrHttp;

/**
 * XhrHttp
 *
 * @class XhrHttp
 * @extends Http
 */
XhrHttp = Http.extend(
    /**
     * @lends XhrHttp.prototype
     */
    {
        /**
         * @param {string} url
         * @param {Object} [options]
         * @param {Object} [options.query]
         * @param {Object} [options.headers]
         * @param {Object} [options.auth]
         * @param {Object} [options.agent]
         * @param {Object} [options.data]
         * @param {Object} [options.timeout]
         * @param {Object} [options.method]
         */
        request: function(url, options) {
            var self = this,
                start, commonLog;

            commonLog = {
                href: url,
                uuid: this.genUUID("req.out")
            };

            options = _.defaults(options || {}, {
                method: "GET"
            });

            start = this.getTime();

            return new Promise(function(resolve, reject) {
                var method, query, data, auth, timeout,
                    config, headers, error, xhr;

                method = options.method;
                data = options.data;

                // @see http://www.w3.org/TR/XMLHttpRequest/ #4.6.6
                if (_.contains(["GET", "HEAD"], method) && data) {
                    error = new HttpError("Could not add body to the GET|HEAD requests");

                    self.logger.fatal("Http request could not be prepared", {
                        context: options,
                        error:     error,
                        namespace: "http",
                        tags:      "error"
                    });

                    throw error;
                }

                if (!_.isEmpty(query = options.query)) {
                    url = url + (url.indexOf("?") !== -1 ? "&" : "?") + querystring.encode(query);
                }

                xhr = new XMLHttpRequest();

                if (headers = options.headers) {
                    _.forEach(headers, function(value, key) {
                        xhr.setRequestHeader(key, value);
                    });
                }

                if (timeout = options.timeout) {
                    xhr.timeout = timeout;
                }

                xhr.ontimeout = function() {
                    reject(new TimeoutError());
                };

                xhr.onabort = function() {
                    reject(new HttpError("Aborted"));
                };

                xhr.onerror = function(err) {
                    reject(new HttpError());
                };

                xhr.onreadystatechange = function() {
                    var status, body, headers, length;

                    // not interesting state
                    if (this.readyState != 4) {
                        return;
                    }

                    status = this.status;
                    body = this.responseText;
                    headers = self.extractHeaders(xhr.getAllResponseHeaders())
                    length = self.byteLength(body) / 1024;

                    self.logger.debug("Received http response", { namespace: "http", tags: "http,response", context: _.extend({
                        duration: self.getTime() - start,
                        body:     length < 10 ? body : "...",
                        length:   Math.ceil(length) + "KB",
                        status:   status,
                        headers:  headers
                    }, commonLog)});

                    resolve({
                        body: body,
                        statusCode: status,
                        headers: headers
                    });
                }

                self.logger.debug("Sending http request", {
                    context:   _.extend({}, options, commonLog),
                    namespace: "http",
                    tags:      "http,request"
                });

                try {
                    xhr.open(method, url, true);                    
                } catch (err) {
                    reject(err);
                    return
                }

                if (auth = options.auth) {
                    xhr.setRequestHeader("Authorization", self.getAuthString(auth.username, auth.password));
                }

                xhr.send(data);
            });
        },

        /**
         * @protected
         * @returns {number}
         */
        getTime: function() {
            return (new Date()).getTime();
        },

        /**
         * @protected
         * @param str
         * @returns {number}
         */
        byteLength: function(str) {
            // returns the byte length of an utf8 string
            var s = str.length;
            for (var i=str.length-1; i>=0; i--) {
                var code = str.charCodeAt(i);
                if (code > 0x7f && code <= 0x7ff) s++;
                else if (code > 0x7ff && code <= 0xffff) s+=2;
                if (code >= 0xDC00 && code <= 0xDFFF) i--; //trail surrogate
            }
            return s;
        },

        /**
         * @protected
         * @param headersString
         */
        extractHeaders: (function() {
            var pattern;

            pattern = /([a-z\-]+):\s*([^\n]+)\n?/gi;

            return function(headersString) {
                var headers, match;

                headers = {};

                while (match = pattern.exec(headersString)) {
                    headers[match[1].toLowerCase()] = match[2];
                }

                return headers;
            }
        })(),

        getAuthString: function(username, password) {
            return "Basic " + btoa([username, password].map(function(item){ return decodeURIComponent(item)}).join(':'))
        }
    }
);

exports.XhrHttp = XhrHttp;
