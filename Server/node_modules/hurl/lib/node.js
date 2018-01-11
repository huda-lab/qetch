var Http         = require("./http").Http,
    http         = require("http"),
    https        = require("https"),
    util         = require("util"),
    url_         = require("url"),
    assert       = require("assert"),
    TimeoutError = require("./error/timeout").TimeoutHttpError,
    querystring  = require("querystring"),
    _            = require("lodash");


exports.NodeHttp = Http.extend({
    /**
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
     */
    request: function(url, options) {
        var self = this,
            ext, commonLog;

        assert(_.isString(url), "Url is expected to be a string");

        options = _.defaults(options || {}, this.options);

        url = url_.parse(url);
        ext = {};

        if (!_.isEmpty(options.query)) {
            ext.query = (url.query ? url.query + "&" : "") + querystring.encode(options.query);
            ext.search = "?" + ext.query;
        }

        url = url_.parse(url_.format(_.extend(url, ext)));

        commonLog = {
            href: url.href,
            uuid: this.genUUID("req.out")
        };

        return new Promise(function(resolve, reject) {
            var request, response, config, proxy, proxyAuth, start,
                data, dataLength, auth;

            if (options.proxy) {
                proxy = url_.parse(self._getProxyString(options.proxy));
                config = {
                    hostname: proxy.hostname,
                    port:     proxy.port,
                    path:     url.href,
                    headers: {
                        'Host': url.hostname
                    }
                };

                if (proxyAuth = proxy.auth) {
                    proxyAuth = proxyAuth.split(":");
                    config.headers['Proxy-Authorization'] = self._getAuthString(proxyAuth[0], proxyAuth[1]);
                }
            } else {
                config = {
                    hostname: url.hostname,
                    port:     url.port,
                    path:     url.path,
                    headers:  {}
                };
            }

            if (auth = options.auth) {
                config.headers['Authorization'] = self._getAuthString(auth.username, auth.password);
            }

            if (data = options.data) {
                if (Buffer.isBuffer(data)) {
                    dataLength = data.length;
                } else if (_.isString(data)) {
                    dataLength = (new Buffer(data)).length;
                }
            }

            if (dataLength) {
                config.headers = config.headers || {};
                config.headers["Content-Length"] = dataLength;
            }

            config.method = options.method;

            _.chain(options)
                .pick(self.constructor.OPTIONS)
                .forEach(function(value, option) {
                    if (_.isPlainObject(config[option])) {
                        _.extend(config[option], value);
                        return;
                    }

                    config[option] = value;
                });

            response = {};

            start = Date.now();

            self.logger.debug("Sending http request", {
                namespace: "http",
                tags:      "http,request",
                context:   _.extend({ data: options.data }, config, commonLog)
            });

            request = (url.protocol == "https:" ? https : http).request(config, function(res) {
                var body, length;

                body   = "";
                length = 0;

                _.extend(response, { request: request }, res);

                res.on('data', function(chunk){
                    body+= chunk.toString();
                    length+= chunk.length / 1024;
                });

                res.on('end', function(){
                    self.logger.debug("Received http response", { namespace: "http", tags: "http,response", context: _.extend({
                        duration: Date.now() - start,
                        length:   Math.ceil(length) + "KB",
                        body:     length < 10 ? body : "...",
                        status:   response.statusCode,
                        headers:  response.headers
                    }, commonLog)});

                    response.body = body;

                    // todo resolve or reject respectively to statusCode
                    resolve(response);
                });

                res.on('error', function(err) {
                    reject(err);
                });
            });

            request.on('socket', function(socket) {
                if (options.timeout) {
                    socket.setTimeout(options.timeout);
                }

                socket.on('timeout', function() {
                    self.logger.error("http request timed out", { namespace: "http", tags: "http,timeout", context: _.extend({
                        duration: Date.now() - start,
                        timeout:  options.timeout
                    }, commonLog)});

                    request.abort();
                    reject(new TimeoutError(util.format("Request timed out for resource '%s'", url.href)));
                });
            });

            request.on('error', function (err) {
                self.logger.error("http request error", { namespace: "http", tags: "http,error", error: err, context: _.extend({
                    duration: Date.now() - start
                }, commonLog)});
                reject(err);
            });

            // add data
            if (options.data) {
                request.write(options.data + "\n");
            }

            // send
            request.end();
        });
    },

    _base64: function(str) {
        return (new Buffer(str || "", "ascii")).toString("base64")
    },

    _getAuthString: function(username, password) {
        return "Basic " + this._base64([username, password].map(function(item){ return querystring.unescape(item)}).join(':'))
    },

    _getProxyString: function(proxy) {
        if (proxy.user) {
            return util.format("%s//%s%5C%s:%s@%s:%s", proxy.scheme, proxy.user.domain, proxy.user.username, proxy.user.password, proxy.host, proxy.port)
        }

        return util.format("%s//%s:%s", proxy.scheme, proxy.host, proxy.port)
    }
}, {
    DEFAULTS: {
        method:  "GET",
        timeout: 60000
    },
    OPTIONS: [
        "headers", // An object containing request headers.
        "auth",    // Basic authentication i.e. 'user:password' to compute an Authorization header.
        "agent"    // Agent field
    ]
});
