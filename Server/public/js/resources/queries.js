var Queries = angular.module('Queries');

Queries.factory('Queries_Resource', function($resource) {
  return $resource('/queries', null, {
    predefinedQueries: {
      method: 'GET',
      isArray: true,
      url: 'queries/predefinedQueries'
    },
    fnQueries: {
      method: 'GET',
      isArray: true,
      url: 'queries/fnQueries'
    }
  });
});