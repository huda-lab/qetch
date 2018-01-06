var Dataset = angular.module('Dataset');

Dataset.controller('Dataset_ViewerCtrl', 
  ['$rootScope', '$scope', '$interval', '$timeout', 'QetchQuery_QueryAPI', 'Dataset_Resource', 'DatasetAPI', 'Parameters',
  function($rootScope, $scope, $interval, $timeout, QetchQuery_QueryAPI, Dataset_Resource, DatasetAPI, Parameters) {

    $scope.$on(Parameters.DATASET_EVENTS.DATASETS_DEFINITION_LOADED, function (event, dataDefinition) {
      $scope.dataDefinition = dataDefinition;
    });
    DatasetAPI.updateDatasetDefinition();

    $scope.dataset = null;
    $scope.selectedSeries = null;
    $scope.multipleSeries = false;
    $scope.smoothedDataId = null;
    $scope.maxSmoothedDataId = DatasetAPI.smoothedDataId;
    $scope.skipSmoothedDataWatch = false;

    $scope.showSeries = function (snum) {
      DatasetAPI.notifyDataChanged(snum);
      DatasetAPI.notifyChangeDataRepresentation(snum, 0);
      DatasetAPI.showMatches(null, null, snum, null, null, false, null);
    };

    $scope.selectDataset = function(req) {
      $scope.notifyDatasetLoading();
      $scope.multipleSeries = !req.snum;
      $scope.selectedSeries = null;
      setTimeout(function () {

        // Clear current data
        QetchQuery_QueryAPI.clear();
        DatasetAPI.clear();
        $scope.dataset = { desc: 'Loading...' };

        DatasetAPI.loadDataSet(req.key, req.snum);

      }, 500);
    };

    $scope.$on(Parameters.DATASET_EVENTS.DATASET_LOADED, function (event, dataset) {
      $scope.dataset = dataset;
      $scope.selectedSeries = $scope.dataset.series[0];
      $scope.maxSmoothedDataId = DatasetAPI.getSmoothIterationsNum(0);
      $scope.notifyDatasetAvailable();
    });

    $scope.$on(Parameters.DATASET_EVENTS.DATA_CHANGED, function (event, seriesNum, values, axes) {
      $scope.selectedSeries = $scope.dataset.series[seriesNum];
      $scope.maxSmoothedDataId = DatasetAPI.getSmoothIterationsNum(seriesNum);
    });

    $scope.$watch('smoothedDataId', function () {
      if (DatasetAPI.data.length > 0 && !$scope.skipSmoothedDataWatch) {
        var snum = DatasetAPI.getSeriesNum($scope.selectedSeries.snum);
        $scope.smoothedDataId = DatasetAPI.showDataRepresentation(snum, $scope.smoothedDataId).smoothId;
        DatasetAPI.showMatches(null, $scope.smoothedDataId, snum, null, null, false, null);
      }
      $scope.skipSmoothedDataWatch = false;
    });

    $scope.showSmoothedData = function (proposedSmoothedDataId) {
      if (DatasetAPI.data.length > 0) {
        $scope.skipSmoothedDataWatch = true;
        var snum = DatasetAPI.getSeriesNum($scope.selectedSeries.snum);
        $scope.smoothedDataId = DatasetAPI.showDataRepresentation(snum, proposedSmoothedDataId).smoothId;
        DatasetAPI.showMatches(null, $scope.smoothedDataId, snum, null, null, false, null);
      }
    };

    document.changeSmooth = function (smootth) {
      $scope.smoothedDataId = smootth;
      if (DatasetAPI.data.length > 0 && !$scope.skipSmoothedDataWatch) {
        var snum = DatasetAPI.getSeriesNum($scope.selectedSeries.snum);
        $scope.smoothedDataId = DatasetAPI.showDataRepresentation(snum, $scope.smoothedDataId).smoothId;
        DatasetAPI.showMatches(null, $scope.smoothedDataId, snum, null, null, false, null);
      }
      $scope.skipSmoothedDataWatch = false;
      $scope.$apply();
    };

    $scope.$on(Parameters.DATASET_EVENTS.DATA_REPRESENTATION_CHANGED, function (event, data, smoothedDataId, handled) {
      $scope.skipSmoothedDataWatch = true;
      $scope.smoothedDataId = smoothedDataId;
    });

}]);