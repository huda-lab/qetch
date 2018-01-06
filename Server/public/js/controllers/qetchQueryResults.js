var QetchQuery = angular.module('QetchQuery');

QetchQuery.controller('QetchQuery_ResultsCntrl', 
  ['$scope', '$timeout', 'QetchQuery_QueryAPI', 'Dataset_Resource', 'DatasetAPI', 'Parameters',
  function ($scope, $timeout, QetchQuery_QueryAPI, Dataset_Resource, DatasetAPI, Parameters) {

    $scope.multipleSeries = false;
    $scope.selectedSeriesNum = 0;

    $scope.matches = null;
    $scope.orderingColumns = ['+adjMatch'];

    $scope.MAX_MATCH_GOOD = Parameters.MAX_MATCH_GOOD;
    $scope.MAX_MATCH_MEDIUM = Parameters.MAX_MATCH_MEDIUM;

    $scope.$on(Parameters.DATASET_EVENTS.MATCHES_CHANGED, function (event, matches, matchIndex) {
      if (matchIndex !== undefined) return;
      $scope.matches = matches;
      $scope.calculateMatchesStats();
      $scope.calculateMatchesAdditionalFeatures();
      $scope.adjustMatches();
      DatasetAPI.showMatches(null, DatasetAPI.smoothedDataId, $scope.selectedSeriesNum, null, null, false, null);
      $timeout(function() {
        $scope.$apply();
      });
    });

    $scope.$on(Parameters.DATASET_EVENTS.SHOW_MATCHES, function (event, matches, matchIndex, smoothIteration, minimumMatch, maximumMatch) {
      var $results = $('.result-display');
      $results.removeClass('displaying');
      for (var i in matches) {
        $results.filter('[data-match-id="' + matches[i].id + '"]').addClass('displaying');
      }
    }); 

    $scope.$on(Parameters.QUERY_EVENTS.CLEAR, function (event, matches, matchIndex) {
      $scope.matches = null;
    });

    $scope.$on(Parameters.DATASET_EVENTS.DATA_CHANGED, function (event, seriesNum, values, axes) {
      $scope.selectedSeriesNum = seriesNum;
    });

    $scope.changeColumnOrdering = function (columnName) {
      var columnIndex = -1;
      for (var i = 0; i < $scope.orderingColumns.length; i++) {
        if ($scope.orderingColumns[i].substr(1) === columnName) {
          columnIndex = i;
          break;
        }
      }

      if (columnIndex == -1) {
        $scope.orderingColumns.unshift('-' + columnName);
      } else if (columnIndex == 0) {
        $scope.orderingColumns[0] = ($scope.orderingColumns[0].substr(0, 1) == '-' ? '+' : '-') + $scope.orderingColumns[0].substr(1);
      } else {
        $scope.orderingColumns.splice(columnIndex);
        $scope.orderingColumns.unshift('-' + columnName);
      }
    };

    $scope.getLastOrderingColumn = function () {
      return $scope.orderingColumns[0].substr(1);
    };

    $scope.getLastOrderingColumnSign = function () {
      return $scope.orderingColumns[0].substr(0,1);
    };

    $scope.getSeriesName = function (snum) {
      return DatasetAPI.dataset.series[snum].desc;
    };

    $scope.$on(Parameters.DATASET_EVENTS.DATASET_LOADED, function (event, dataset) {
      $scope.multipleSeries = dataset.series.length > 1;
    });

    $scope.matchValueClass = function (matchValue) {
      if (matchValue < $scope.MAX_MATCH_GOOD) {
        return 'label-success';
      } else if (matchValue < $scope.MAX_MATCH_MEDIUM) {
        return 'label-warning';
      } else {
        return 'label-danger';
      }
    };

    $scope.getFeedbackClass = function (matchIdx, btnValue) {
      var feedback = $scope.matches[matchIdx].feedback;
      if (feedback === undefined || feedback === null) return '';
      if (feedback > 0 && !btnValue) return '';
      if (feedback < 0 && btnValue) return '';
      if (feedback == -1) return 'btn-light-danger';
      if (feedback == -2) return 'btn-danger';
      if (feedback == 1) return 'btn-light-success';
      if (feedback == 2) return 'btn-success';
    };

    // To show a particular match from the list
    $scope.showMatch = function (i, snum, smoothIteration) {
      DatasetAPI.notifyDataChanged(snum);
      DatasetAPI.showDataRepresentation(snum, smoothIteration);
      var $results = $('.result-display');
      $results.removeClass('displaying');
      DatasetAPI.showMatches(i, null, null, null, null, false, null);
    };

    $scope.showMatches = function (minimumMatch, maximumMatch) {
      DatasetAPI.showDataRepresentation($scope.selectedSeriesNum, 0);
      var $results = $('.result-display');
      $results.removeClass('displaying');
      DatasetAPI.showMatches(null, null, $scope.selectedSeriesNum, minimumMatch, maximumMatch, false, null);
    };

    document.showAllMatches = function () {
      $scope.showMatches(0, Number.MAX_VALUE);
      $scope.$apply();
    };

    $scope.showMatchesFromFeedback = function (feedback) {
      DatasetAPI.showDataRepresentation($scope.selectedSeriesNum, 0);
      var $results = $('.result-display');
      $results.removeClass('displaying');
      DatasetAPI.showMatches(null, null, $scope.selectedSeriesNum, null, null, false, feedback);
    };

    /* Feedback -------------- */

    $scope.matchesStats = {
      meanSize: undefined
    };

    $scope.feedbacks = [];

    $scope.calculateMatchesStats = function () {
      if ($scope.matches.length === 0) return 0;
      var sizeSum = 0, currMatch;
      for (var i = 0; i < $scope.matches.length; i++) {
        currMatch = $scope.matches[i];
        sizeSum += currMatch.size;
      }
      $scope.matchesStats.meanSize = sizeSum / $scope.matches.length;
    };

    $scope.calculateMatchesAdditionalFeatures = function () {
      for (var i = 0; i < $scope.matches.length; i++) {
        var currMatch = $scope.matches[i];

        currMatch.timeSpanDistance = (currMatch.size - $scope.matchesStats.meanSize) /
            (currMatch.timespan.value >= $scope.matchesStats.meanSize) ? (1 - $scope.matchesStats.meanSize)
                                                                       : $scope.matchesStats.meanSize;

        var cpy, ySum = 0, minY = Number.MAX_SAFE_INTEGER, maxY = Number.MIN_SAFE_INTEGER;
        for (var j = 0; j < currMatch.points.length; j++) {
          cpy = currMatch.points[j].y;
          ySum += cpy;
          if (minY > cpy) minY = cpy;
          if (maxY < cpy) maxY = cpy;
        }
        currMatch.altitude = (ySum / currMatch.points.length) / DatasetAPI.displayHeight; //maeda's suggested feature :)
        currMatch.height = (maxY - minY) / DatasetAPI.displayHeight;

        // TODO other features...

      }
    };

    $scope.adjustMatches = function () {
      var match, i;
      if ($scope.feedbacks.length > 0) {
        var feedbacksDecisionTree = new dt.DecisionTree({
          trainingSet: $scope.feedbacks,
          categoryAttr: 'feedback',
          ignoredAttributes: []
        });

        for (i = 0; i < $scope.matches.length; i++) {
          match = $scope.matches[i];
          if (match.feedback !== -2 && match.feedback !== 2) {
            match.feedback = (feedbacksDecisionTree.predict({
                timeSpanDistance: match.timeSpanDistance,
                smoothIteration: match.smoothIteration,
                matchPos: match.matchPos,
                altitude: match.altitude,
                height: match.height
              }) == 'true') ? 1 : -1;
          }
          match.adjMatch = match.match; // * (match.feedback ? 0.5 : 1.5);
        }

      } else {
        for (i = 0; i < $scope.matches.length; i++) {
          match = $scope.matches[i];
          match.feedback = undefined;
          match.adjMatch = match.match;
        }
      }
    };

    $scope.feedback = function (matchId, feedback) {
      var match = $scope.matches[matchId];
      match.feedback = feedback ? 2 : -2;
      $scope.feedbacks.push({
        timeSpanDistance: match.timeSpanDistance,
        smoothIteration: match.smoothIteration,
        matchPos: match.matchPos,
        altitude: match.altitude,
        height: match.height,
        feedback: feedback
      });
      $scope.adjustMatches();
    };

    $scope.clearFeedbackStats = function () {
      console.log('clearing ', $scope.feedbacks.length, ' feedbacks');
      $scope.feedbacks = [];
      $scope.adjustMatches();
    }

  }

]);