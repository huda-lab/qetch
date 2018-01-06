var QetchQuery = angular.module('QetchQuery');

QetchQuery.controller('QetchQuery_PaperCtrl',
  ['$scope', '$interval', '$compile', '$timeout', 'QetchQuery_QueryAPI', 'QetchQuery_DrawRefining', 'Parameters',
    function ($scope, $interval, $compile, $timeout, QetchQuery_QueryAPI, QetchQuery_DrawRefining, Parameters) {

      $scope.historyVisible = false;
      $scope.historyHtmlContent = $('<div class="content"></div>');

      $scope.predefinedQueriesVisible = false;
      $scope.predefinedQuerySuggestion = null;
      $scope.predefiendQueryHtmlContent = $('<div class="content"></div>');

      $scope.queryFnSuggestionVisible = false;
      $scope.queryFnSuggestion = null;
      $scope.queryFnSuggestionHtmlContent = $('<div class="content"></div>');
      $scope.queryFnSuggestionConstants = {};

      $scope.predefinedQueriesToggle = function () {
        $scope.predefinedQueriesVisible = !$scope.predefinedQueriesVisible;
        $scope.updateUIForPredefinedQueries();
      };
      $scope.updateUIForPredefinedQueries = function () {
        if ($scope.predefinedQueriesVisible) {
          if ($scope.historyVisible) $scope.historyQueriesToggle();
          if ($scope.queryFnSuggestionVisible) $scope.queryFnSuggestionToggle();
          $('#quickDrawPanel').find('.scroll-container').append($scope.predefiendQueryHtmlContent);
        } else {
          $scope.predefiendQueryHtmlContent.detach();
        }
      };
      $scope.showSuggestedPredefinedQuery = function () {
        $scope.predefinedQueriesVisible = true;
        $scope.updateUIForPredefinedQueries();
        $timeout(function () {
          var $qrContainer = $('#queryAndResultsContainer');
          var $sc = $qrContainer.find('.scroll-container');
          var hightlightedQueryLeft = $qrContainer.find('.query-preview.hightlighted').offset().left - $sc.offset().left;
          $sc.scrollLeft(hightlightedQueryLeft);
        });
      };

      $scope.historyQueriesToggle = function () {
        $scope.historyVisible = !$scope.historyVisible;
        $scope.updateUIForHistoryQueries();
      };
      $scope.updateUIForHistoryQueries = function () {
        if ($scope.historyVisible) {
          if ($scope.predefinedQueriesVisible) $scope.predefinedQueriesToggle();
          if ($scope.queryFnSuggestionVisible) $scope.queryFnSuggestionToggle();
          var scrollContainer = $('#quickDrawPanel').find('.scroll-container');
          scrollContainer.append($scope.historyHtmlContent);
          setTimeout(function () {
            scrollContainer.scrollLeft($scope.historyHtmlContent.width());
          }, 10);
        } else {
          $scope.historyHtmlContent.detach();
        }
      };

      $scope.$watchCollection('queryFnSuggestionConstants', function () {
        if (!$scope.queryFnSuggestion) return;
        var fpoints = QetchQuery_DrawRefining.generatePointsForFn($scope.queryFnSuggestion.fn, $scope.queryFnSuggestionConstants);
        $scope.queryFnSuggestion.points = fpoints;
        $scope.$broadcast(Parameters.QUERY_EVENTS.DRAW_PREVIEW, fpoints, true);
      });

      $scope.drawQueryFnSuggestion = function () {
        var points = $scope.queryFnSuggestion.points;
        $scope.clearQuerySuggestions();
        $scope.$broadcast(Parameters.QUERY_EVENTS.DRAW, points, true, true);
      };

      $scope.showSuggestedQueryFn = function () {
        $scope.queryFnSuggestionVisible = true;
        $scope.updateUIForSuggestedQueryFn();
        $timeout(function () {
          $scope.queryFnSuggestionConstants = $scope.queryFnSuggestion.cons;
          var fnElStr = '<form class="pull-left" ng-submit="drawQueryFnSuggestion()"><div class="binline">' +
            $scope.queryFnSuggestion.fn.fStr + '</div>' +
            ' <button type="submit" class="btn btn-default btn-xs binline">OK</button></form>';
          for (var c in $scope.queryFnSuggestionConstants) {
            fnElStr = fnElStr.replace('#' + c + '#', '<input type="number" step="0.001" ng-model="queryFnSuggestionConstants.' + c + '"/>');
          }
          $scope.queryFnSuggestionHtmlContent.empty();
          $scope.queryFnSuggestionHtmlContent.append($compile(fnElStr)($scope));
        });
      };
      $scope.queryFnSuggestionToggle = function () {
        $scope.queryFnSuggestionVisible = !$scope.queryFnSuggestionVisible;
        $scope.updateUIForSuggestedQueryFn();
      };
      $scope.updateUIForSuggestedQueryFn = function () {
        if ($scope.queryFnSuggestionVisible) {
          if ($scope.historyVisible) $scope.historyQueriesToggle();
          if ($scope.predefinedQueriesVisible) $scope.predefinedQueriesToggle();
          $('#quickDrawPanel').find('.scroll-container').append($scope.queryFnSuggestionHtmlContent);
        } else {
          $scope.queryFnSuggestionHtmlContent.detach();
        }
      };

      $scope.updateUIClosingAll = function () {
        $scope.historyVisible = false;
        $scope.updateUIForHistoryQueries();
        $scope.queryFnSuggestionVisible = false;
        $scope.updateUIForSuggestedQueryFn();
        $scope.predefinedQueriesVisible = false;
        $scope.updateUIForPredefinedQueries();
      };

      $scope.$on(Parameters.QUERY_REFINEMENT_EVENTS.QUERY_FN_SUGGESTION, function (event, pattern) {
        $scope.queryFnSuggestion = pattern;
        if ($scope.queryFnSuggestionVisible) {
          if (pattern === null) {
            $scope.$broadcast(Parameters.QUERY_EVENTS.CLEAN_DRAW_PREVIEW);
            $scope.queryFnSuggestionToggle();
          }
          else $scope.showSuggestedQueryFn();
        }
        $scope.$apply();
      });

      $scope.$on(Parameters.QUERY_REFINEMENT_EVENTS.PREDEFINED_QUERIES_LOADED, function (event, predefinedQueries) {
        for (var i = 0; i < predefinedQueries.length; i++) {
          var canv = $scope.createCanvasForPoints(predefinedQueries[i].points, predefinedQueries[i].bounds);
          canv.data('data-query', i);
          canv.click(function () {
            $scope.clearQuerySuggestions();
            var query = QetchQuery_DrawRefining.predefinedQueries[$(this).data('data-query')];
            $scope.$broadcast(Parameters.QUERY_EVENTS.DRAW, query.points, true, true);
            $scope.$apply();
          });
          canv.on('mouseleave', function () {
            $scope.$broadcast(Parameters.QUERY_EVENTS.CLEAN_DRAW_PREVIEW);
          });
          canv.on('mouseenter', function () {
            var query = QetchQuery_DrawRefining.predefinedQueries[$(this).data('data-query')];
            $scope.$broadcast(Parameters.QUERY_EVENTS.DRAW_PREVIEW, query.points, true);
          });
          $scope.predefiendQueryHtmlContent.append(canv);
        }
      });

      $scope.$on(Parameters.QUERY_REFINEMENT_EVENTS.SUGGEST_PREDEFINED_QUERY, function (event, id) {
        var queryPreviews = $scope.predefiendQueryHtmlContent.find('.query-preview');
        queryPreviews.removeClass('hightlighted');
        if (id !== null) queryPreviews.eq(id).addClass('hightlighted');
        $scope.predefinedQuerySuggestion = id;
        $scope.$apply();
      });

      $scope.$on(Parameters.QUERY_REFINEMENT_EVENTS.QUERY_HISTORY_UPDATE, function (event, history) {
        $scope.historyHtmlContent.each(function (i, el) {
          $(el).detach();
        });
        for (var i = 0; i < history.length; i++) {
          if (history[i].element === undefined) {
            history[i].element = $scope.createCanvasForPoints(history[i].points, history[i].bounds);
            history[i].element.data('data-query', i);
            history[i].element.click(function () {
              $scope.clearQuerySuggestions();
              var query = QetchQuery_DrawRefining.queryHistory[$(this).data('data-query')];
              $scope.$broadcast(Parameters.QUERY_EVENTS.DRAW, query.points, false, true);
              $scope.$apply();
            });
          }
          $scope.historyHtmlContent.append(history[i].element);
        }
        if ($scope.historyVisible) $scope.historyQueriesToggle();
        $scope.$apply();
      });

      // create a canvas for the specified points. This is used to create the thumbnails of the queries.
      $scope.createCanvasForPoints = function (points, bounds) {
        var canv = $('<canvas class="query-preview" width="' +
          Parameters.QUERY_PREVIEW_WIDTH + '" height="' +
          Parameters.QUERY_PREVIEW_HEIGHT + '"></canvas>');
        canv.width(Parameters.QUERY_PREVIEW_WIDTH);
        canv.height(Parameters.QUERY_PREVIEW_HEIGHT);
        var ctx = canv.get(0).getContext('2d');
        var availableWidth = Parameters.QUERY_PREVIEW_WIDTH - 2 * Parameters.QUERY_PREVIEW_DRAW_PADDING;
        var sf = Parameters.QUERY_PREVIEW_HEIGHT / (bounds.maxY - bounds.minY);
        if ((bounds.maxX - bounds.minX) * sf > availableWidth) sf = availableWidth / (bounds.maxX - bounds.minX);
        ctx.beginPath();
        ctx.moveTo(points[0].x * sf + Parameters.QUERY_PREVIEW_DRAW_PADDING,
          ((bounds.maxY - bounds.minY) - points[0].y) * sf + Parameters.QUERY_PREVIEW_DRAW_PADDING);
        for (var j = 1; j < points.length; j++) {
          ctx.lineTo(points[j].x * sf + Parameters.QUERY_PREVIEW_DRAW_PADDING,
            ((bounds.maxY - bounds.minY) - points[j].y) * sf + Parameters.QUERY_PREVIEW_DRAW_PADDING);
        }
        ctx.stroke();
        return canv;
      };

      $scope.clear = function () {
        QetchQuery_QueryAPI.clear();
        $scope.clearQuerySuggestions();
      };

      $scope.clearQuerySuggestions = function () {
        var queryPreviews = $scope.predefiendQueryHtmlContent.find('.query-preview');
        queryPreviews.removeClass('hightlighted');
        $scope.predefinedQuerySuggestion = null;
        $scope.queryFnSuggestion = null;
        $scope.queryFnSuggestionConstants = {};
        $scope.updateUIClosingAll();
      };

      $scope.addRegexOp = function (op) {
        $scope.$broadcast(Parameters.QUERYPAPER_EVENTS.ADD_REGEXP_OP, op);
      };

      // Query length
      $scope.queryLength = 0;
      $scope.queryLengthCanConfirm = false;
      $scope.queryLengthTolerance = 1;
      $scope.queryLengthStrictMode = Parameters.QUERYLENGTH_INITIAL_STRICT_MODE;
      $scope.queryLengthPanelVisible = false;
      $scope.setQueryLength = function () {
        $scope.queryLengthPanelVisible = true;
      };
      $scope.queryLengthUnit = {str: 'ms', mul: 1};
      $scope.setQueryLengthUnit = function (str) {
        switch (str) {
          case 'ms':
            $scope.queryLengthUnit.mul = 1;
            break;
          case 's':
            $scope.queryLengthUnit.mul = 1000;
            break;
          case 'min':
            $scope.queryLengthUnit.mul = 1000 * 60 * 60;
            break;
          case 'day':
            $scope.queryLengthUnit.mul = 1000 * 60 * 60 * 24;
            break;
        }
        $scope.queryLengthUnit.str = str;
      };
      $scope.$watch('queryLength', function (value) {
        $scope.queryLengthCanConfirm = (value !== undefined && value !== null && value > 0);
      });
      $scope.closeQueryLengthPanel = function (confirm) {
        $scope.queryLengthPanelVisible = false;
        var queryLength = null, queryLengthStr = null, toleranceStr = null;
        if (confirm) {
          toleranceStr = $scope.queryLengthTolerance === 0 ? '' : (' ± ' + Math.round($scope.queryLength * $scope.queryLengthTolerance / 100) + ' ');
          queryLength = $scope.queryLength * $scope.queryLengthUnit.mul;
          queryLengthStr = $scope.queryLength + toleranceStr + $scope.queryLengthUnit.str;
        }
        QetchQuery_QueryAPI.setQueryLength(queryLength, $scope.queryLengthTolerance / 100, $scope.queryLengthStrictMode);
        $scope.$broadcast(Parameters.QUERY_REFINEMENT_EVENTS.SET_QUERY_LENGTH, queryLength, queryLengthStr);
      };


      // Query height
      $scope.queryHeight = 0;
      $scope.queryHeightCanConfirm = false;
      $scope.queryHeightTolerance = 1;
      $scope.queryHeightPanelVisible = false;
      $scope.setQueryHeight = function () {
        $scope.queryHeightPanelVisible = true;
      };
      $scope.$watch('queryHeight', function (value) {
        $scope.queryHeightCanConfirm = (value !== undefined && value !== null && value > 0);
      });
      $scope.closeQueryHeightPanel = function (confirm) {
        $scope.queryHeightPanelVisible = false;
        var queryHeight = null, queryHeightStr = null, toleranceStr = null;
        if (confirm) {
          toleranceStr = $scope.queryHeightTolerance === 0 ? '' : (' ± ' + Math.round($scope.queryHeight * $scope.queryHeightTolerance / 100));
          queryHeight = $scope.queryHeight;
          queryHeightStr = $scope.queryHeight + toleranceStr;
        }
        QetchQuery_QueryAPI.setQueryHeight(queryHeight, $scope.queryHeightTolerance / 100);
        $scope.$broadcast(Parameters.QUERY_REFINEMENT_EVENTS.SET_QUERY_HEIGHT, queryHeight, queryHeightStr);
      };


      // Query horizontal offset
      $scope.queryHorizontalOffset = {min: 0, max: 0};
      $scope.queryHorizontalOffsetCanConfirm = false;
      $scope.queryHorizontalOffsetPanelVisible = false;
      $scope.setQueryHorizontalOffset = function () {
        $scope.queryHorizontalOffsetPanelVisible = true;
      };
      $scope.queryHorizontalOffsetUnit = {str: 'ms', mul: 1};
      $scope.setQueryHorizontalOffsetUnit = function (str) {
        switch (str) {
          case 'ms':
            $scope.queryHorizontalOffsetUnit.mul = 1;
            break;
          case 's':
            $scope.queryHorizontalOffsetUnit.mul = 1000;
            break;
          case 'min':
            $scope.queryHorizontalOffsetUnit.mul = 1000 * 60 * 60;
            break;
          case 'day':
            $scope.queryHorizontalOffsetUnit.mul = 1000 * 60 * 60 * 24;
            break;
        }
        $scope.queryHorizontalOffsetUnit.str = str;
      };
      $scope.$watch('queryHorizontalOffset', function (value) {
        $scope.queryHorizontalOffsetCanConfirm = (value !== undefined && value !== null && (value.min > 0 || value.max > 0));
      }, true);
      $scope.closeQueryHorizontalOffsetPanel = function (confirm) {
        $scope.queryHorizontalOffsetPanelVisible = false;
        var queryHorizontalOffset = null;
        if (confirm) {
          queryHorizontalOffset = {
            min: $scope.queryHorizontalOffset.min * $scope.queryHorizontalOffsetUnit.mul,
            max: $scope.queryHorizontalOffset.max * $scope.queryHorizontalOffsetUnit.mul
          };
        }
        QetchQuery_QueryAPI.setQueryHorizontalOffset(queryHorizontalOffset);
        $scope.$broadcast(Parameters.QUERY_REFINEMENT_EVENTS.SET_QUERY_HORIZONTAL_OFFSET, queryHorizontalOffset);
      };


      // Query vertical offset
      $scope.queryVerticalOffset = {min: 0, max: 0};
      $scope.queryVerticalOffsetCanConfirm = false;
      $scope.queryVerticalOffsetPanelVisible = false;
      $scope.setQueryVerticalOffset = function () {
        $scope.queryVerticalOffsetPanelVisible = true;
      };
      $scope.$watch('queryVerticalOffset', function (value) {
        $scope.queryVerticalOffsetCanConfirm = (value !== undefined && value !== null && (value.min > 0 || value.max > 0));
      }, true);
      $scope.closeQueryVerticalOffsetPanel = function (confirm) {
        $scope.queryVerticalOffsetPanelVisible = false;
        var queryVerticalOffset = null;
        if (confirm) {
          queryVerticalOffset = $scope.queryVerticalOffset;
        }
        QetchQuery_QueryAPI.setQueryVerticalOffset(queryVerticalOffset);
        $scope.$broadcast(Parameters.QUERY_REFINEMENT_EVENTS.SET_QUERY_VERTICAL_OFFSET, queryVerticalOffset);
      };


      // Regexp operators
      $scope.notOperatorValue = Parameters.NOT_OPERATOR_INITIAL_VALUE;
      $scope.regexpSizePanelVisible = false;
      $scope.setRegexpSize = function () {
        $scope.regexpSizePanelVisible = true;
      };
      $scope.regexpSize = 1;
      $scope.regexpSizeCanConfirm = false;
      $scope.$watch('regexpSize', function (value) {
        $scope.regexpSizeCanConfirm = (value !== undefined && value !== null && value > 1);
      });
      $scope.closeRegexpSizePanel = function (confirm) {
        $scope.regexpSizePanelVisible = false;
        if (confirm) $scope.addRegexOp({op:'+', draw: true, size: $scope.regexpSize});
      };

    }]);