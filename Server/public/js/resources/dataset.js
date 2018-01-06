var Dataset = angular.module('Dataset');

Dataset.factory('Dataset_Resource', function($resource) {
  return $resource('/datasets/:key/:snum', null, {
    definition: {
      method: 'GET',
      url: '/datasets/definition'
    },
    newDatasetSeries: {
    	method: 'POST',
    	url: '/datasets/series/:key/:snum'
    },
    newDatasetType: {
    	method: 'POST',
    	url: '/datasets/seriestype/:key'
    },
    deleteDatasetType: {
    	method: 'DELETE',
    	url: '/datasets/seriestype/:key'
    },
    deleteDatasetSeries: {
    	method: 'DELETE',
    	url: '/datasets/series/:key/:snum'
    }
  });
});