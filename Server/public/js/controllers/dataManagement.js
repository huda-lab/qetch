var Dataset = angular.module('Dataset');

Dataset.controller('DataManagementCtrl', ['$scope', '$timeout', 'Dataset_Resource', 'DatasetAPI', 'Parameters',
  function($scope, $timeout, Dataset_Resource, DatasetAPI, Parameters) {

    // used to notify if there was some specific errors
    $scope.error = undefined;

    // Call the dataset resource to get the dataset definition of all the available data
    DatasetAPI.updateDatasetDefinition();

    $('#loadingDataDialog form').validator().on('submit', function(e) {
      if (!e.isDefaultPrevented()) {
        Dataset_Resource.newDatasetSeries({
          key: $scope.datasetSeriesType,
          snum: $scope.datasetSeriesKey
        }, {
          datasetSeriesDesc: $scope.datasetSeriesDesc,
          datasetSeriesData: $scope.datasetSeriesData
        }).$promise.then(function (data) {
          $scope.resetForms();
          $('#loadingDataDialog').modal('hide');
          DatasetAPI.updateDatasetDefinition();
        }, function (error) {
          $scope.error = error.data;
        });
      }
    });

    $('#definingSeriesType form').validator().on('submit', function(e) {
      if (!e.isDefaultPrevented()) {
        Dataset_Resource.newDatasetType({
          key: $scope.datasetSeriesType,
        }, {
          datasetTypeDesc: $scope.datasetTypeDesc,
          datasetTypeRelativeTime: $scope.datasetTypeRelativeTime,
          datasetTypeXAxisDesc: $scope.datasetTypeXAxisDesc,
          datasetTypeYAxisDesc: $scope.datasetTypeYAxisDesc,
          datasetTypeXAxisType: $scope.datasetTypeXAxisType,
          datasetTypeYAxisType: $scope.datasetTypeYAxisType,
          datasetTypeXAxisFormat: $scope.datasetTypeXAxisFormat
        }).$promise.then(function(data) {
					$scope.resetForms();
          $('#definingSeriesType').modal('hide');
          DatasetAPI.updateDatasetDefinition();
        }, function(error) {
          $scope.error = error.data;
        });
      }
    });

    $scope.getDataDefinition = function () {
      return DatasetAPI.dataDefinition;
    };

    $scope.getDataDefinitionSeries = function (key) {
      return DatasetAPI.getDataDefinitionSeries(key);
    };

    $scope.deleteTimeSeriesType = function () {
    	Dataset_Resource.deleteDatasetType({
        key: $scope.datasetSeriesType,
      }).$promise.then(function (data) {
        $scope.resetForms();
        $('#dataManagmentExistingData').modal('hide');
        DatasetAPI.updateDatasetDefinition();
      }, function (error) {
    		$scope.error = (error.data.code == 23503) ? 'Please remove all the time series before' : error.data;
      });
    };

    $scope.deleteTimeSeries = function () {
      Dataset_Resource.deleteDatasetSeries({
        key: $scope.datasetSeriesType,
        snum: $scope.datasetSeriesKey
      }).$promise.then(function (data) {
        $scope.resetForms();
        $('#dataManagmentExistingData').modal('hide');
        DatasetAPI.updateDatasetDefinition();
      }, function (error) {
        $scope.error = error.data;
      });
    };

    $scope.resetForms = function () {
    	$scope.error = undefined;

      $scope.datasetTypeDesc = '';
      $scope.datasetTypeRelativeTime = false;
      $scope.datasetTypeXAxisDesc = 'X';
      $scope.datasetTypeYAxisDesc = 'Y';
      $scope.datasetTypeXAxisType = 'number';
      $scope.datasetTypeYAxisType = 'date';
      $scope.datasetTypeXAxisFormat = '';

      $scope.datasetSeriesType = '';
      $scope.datasetSeriesKey = '';
      $scope.datasetSeriesDesc = '';
      $scope.datasetSeriesData = '';
    };

    $scope.resetForms();

  }
]);
