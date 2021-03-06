angular.module('prismic.io', []).factory('PrismicRequestHandler', function ($http) {
    return function requestHandler(url, cb) {
        $http.get(url).then(function (response) {
            cb(response.data);
        });
    };
}).provider('Prismic', function(){
    this.$get = function ($http, $window, PrismicRequestHandler, $q) {
        var requestHandler = PrismicRequestHandler;
        var PrismicBackend = $window.Prismic;

        var _accessToken = '',
            _setAccessToken = function setAccessToken(token) {
                _accessToken = token;
            },

            _clientId = '',
            _setClientId = function setClientId(clientId) {
                _clientId = clientId;
            },

            _clientSecret = '',
            _setClientSecret = function setClientSecret(clientSecret) {
                _clientSecret = clientSecret;
            },

            _APIEndpoint = '',
            _setAPIEndpoint = function (endpoint) {
                _APIEndpoint = endpoint;
            };


        var parseQS = function(query) {
            var params = {},
                match,
                pl = /\+/g,
                search = /([^&=]+)=?([^&]*)/g,
                decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); };
            while (match = search.exec(query)) {
                params[decode(match[1])] = decode(match[2]);
            }
            return params;
        };

        var getApiHome = function(callback) {

            PrismicBackend.Api(_APIEndpoint, callback, _accessToken);
        };

        var buildContext = function(ref, callback) {
            // retrieve the API
            getApiHome(function(err, api) {

                var ctx = {
                    ref: (ref || api.data.master.ref),
                    api: api,
                    maybeRef: (ref && ref != api.data.master.ref ? ref : ''),
                    maybeRefParam: (ref && ref != api.data.master.ref ? '&ref=' + ref : ''),

                    oauth: function() {
                        var token = _accessToken;
                        return {
                            accessToken: token,
                            hasPrivilegedAccess: !!token
                        }
                    },

                    linkResolver: function(doc) {
                        return 'detail.html?id=' + doc.id + '&slug=' + doc.slug + ctx.maybeRefParam;
                    }
                }
                callback(ctx);
            });
        };

        var withPrismic = function(callback) {
            buildContext(queryString['ref'], function(ctx) {
                callback.apply(window, [ctx]);
            });
        };

        var queryString = parseQS(window.location.search.substring(1));

        // Hash data
        var encodedHash = parseQS(window.location.hash.substring(1));


        var _get = function () {

            var deferred = $q.defer();
            withPrismic(function (ctx) {
                //fixed - added err param to callback function

                ctx.api.forms("everything").ref(ctx.ref).submit(function(err,docs) {
                    deferred.resolve(docs);
                })
            });

            return deferred.promise;
        };

        var _query = function (predicate, options) {

            options.pageSize =  (options.pageSize == 'undefined') ? 20 : options.pageSize;
            options.page =  (options.page == 'undefined') ? 1 : options.page;

            var deferred = $q.defer();


            withPrismic(function (ctx) {
                ctx.api.form('everything').page(options.page).pageSize(options.pageSize).query(predicate).ref(ctx.ref).submit(function(err,results) {
                    deferred.resolve(results);
                });
            });

            return deferred.promise;
        };

        var _types = function(){
            var deferred = $q.defer();
            withPrismic(function(ctx){
                deferred.resolve(ctx.api.data.types)
            })
            return deferred.promise;
        }

        return {
            setAccessToken: _setAccessToken,
            setClientId: _setClientId,
            setClientSecret: _setClientSecret,
            setAPIEndpoint: _setAPIEndpoint,
            get: _get,
            query: _query,
            types: _types
        }
    }
});

