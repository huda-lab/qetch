var Dataset = angular.module('Dataset');

// Directive, that also modift the DOM according to the model (changed through the DatasetAPI)
Dataset.directive('datasetPlot', ['$location', '$anchorScroll', 'DatasetAPI', 'Parameters', function($location, $anchorScroll, DatasetAPI, Parameters) {
  return {
    restriction: 'E',
    replace: true,
    template: '<div><svg id="dataset"></svg><svg id="navigator"></svg></div>',
    scope: {
      //
    },
    link: function($scope, element, attrs) {

      var $element = $(element);

      $scope.configureDimensions = function () {
        $scope.topBottomMargin = Parameters.plotMargin.top + Parameters.plotMargin.bottom;
        $scope.leftRightMargin = Parameters.plotMargin.left + Parameters.plotMargin.right;
        $scope.navigatorTopBottomMargin = Parameters.navigatorMargin.top + Parameters.navigatorMargin.bottom;
        $scope.width = $element.parent().parent().width() - $scope.leftRightMargin; //the element and its container could not be visible, so the parent
        $scope.mainChartHeight = $element.height() / 4 * 3 - $scope.topBottomMargin;
        $scope.navigatorHeight = $element.height() / 4 - $scope.navigatorTopBottomMargin;
        DatasetAPI.setDisplaySize($scope.width, $scope.mainChartHeight);
      };

      //Callback to display the matches
      $scope.$on(Parameters.DATASET_EVENTS.SHOW_MATCHES, function (event, matches, matchIndex, smoothIteration, minimumMatch, maximumMatch, highlightInMatchesList) {
        var $element = $(element);
        $element.find('> #dataset .line-match, > #dataset .debug-line').remove(); // clean the other matches
        $scope.svg = d3.select($element.find('> #dataset .main')[0]);

        if (smoothIteration !== null) $scope.smoothIteration = smoothIteration;

        if (matches.length === 0) return;
        else if (matches.length == 1) {
          // Append only one match
          $scope.drawLine(matches[0].id, matches[0].points, matches[0].match);
          $scope.drawDebugLines(matches[0].debugLines);

          // translate to show the match in the correct position
          $scope.zoom.translate([$scope.zoom.translate()[0] - $scope.xScale(matches[0].points[0].origX) + 100, 0]);
          $scope.zoom.event($scope.svg);

          if (highlightInMatchesList) {
            $location.hash('result-' + matches[0].id);
            $anchorScroll();
          }

        } else {
          for (var i in matches) {
            var matchValueToDisplay = matches[i].match;
            // if (smoothIteration !== null && minimumMatch === null && maximumMatch === null) matchValueToDisplay = 1;
            $scope.drawLine(matches[i].id, matches[i].points, matchValueToDisplay);
            $scope.drawDebugLines(matches[i].debugLines);
          }
        }

        $scope.redrawPlot();
      });

      $scope.$on(Parameters.DATASET_EVENTS.DATA_REPRESENTATION_CHANGED, function (event, data, smoothedDataId, handled) {
        if (handled) return;

        if (data === null) {
          $(element).find('> #dataset .smoothed-dataset-line').remove(); // clean the chart
          return;
        }

        if (smoothedDataId !== null) $scope.smoothIteration = smoothedDataId;

        var p = $scope.svg.select('.smoothed-dataset-line');
        if (p.empty()) {
          // Smoothed Dataset path
          $scope.svg.append('path')
            .datum(data)
            .attr('class', 'line smoothed-dataset-line');
        } else {
          console.log('update');
          p.datum(data);
        }

        $scope.redrawPlot();
      });

      $scope.$on(Parameters.QUERY_EVENTS.CLEAR, function (event, matches, matchIndex) {
        $(element).find('> #dataset .line-match, > #dataset .debug-line').remove(); // clean the other matches
      });

      //Directive callbacks to configure the data
      $scope.$on(Parameters.DATASET_EVENTS.DATA_CHANGED, function (event, seriesNum, data, axes) {
        $(element).find('> #dataset *, > #navigator *').remove(); // clean the chart
        if (data === null) return;

        $scope.configureDimensions();

        $scope.seriesNum = seriesNum;

        $scope.dataMinX = data[0].x;
        $scope.dataMaxX = _.last(data).x;

        // Scales
        $scope.xScale = axes.xAxis.type === 'date' ?
            d3.time.scale().range([0, $scope.width]) :
            d3.scale.linear().range([0, $scope.width]);
        $scope.yScale = d3.scale.linear().range([$scope.mainChartHeight, 0]);
        $scope.navXScale = axes.xAxis.type === 'date' ?
            d3.time.scale().range([0, $scope.width]) :
            d3.scale.linear().range([0, $scope.width]);
        $scope.navYScale = d3.scale.linear().range([$scope.navigatorHeight, 0]);

        // Domains
        $scope.xScale.domain(d3.extent(data, function (p) { return p.x; }));
        $scope.yScale.domain(d3.extent(data, function (p) { return p.y; }));
        $scope.navXScale.domain(d3.extent(data, function (p) { return p.x; }));
        $scope.navYScale.domain(d3.extent(data, function (p) { return p.y; }));

        $scope.xAxis = d3.svg.axis().scale($scope.xScale).orient('bottom');
        $scope.yAxis = d3.svg.axis().scale($scope.yScale).orient('left');
        $scope.navXAxis = d3.svg.axis().scale($scope.navXScale).orient('bottom');
        $scope.line = d3.svg.line()
            .x(function(p) { return $scope.xScale(p.x); })
            .y(function(p) { return $scope.yScale(p.y); });
        $scope.navLine = d3.svg.line()
            .x(function(p) { return $scope.navXScale(p.x); })
            .y(function(p) { return $scope.navYScale(p.y); });

        // initialize the main chart
        $scope.svg = d3.select($element.find('> #dataset')[0])
            .attr('width', $scope.width + $scope.leftRightMargin)
            .attr('height', $scope.mainChartHeight + $scope.topBottomMargin)
          .append('g')
            .attr('class', 'main')
            .attr('transform', 'translate(' + 
              Parameters.plotMargin.left + ',' + 
              Parameters.plotMargin.top + ')');

        // X Axis (main chart)
        $scope.svg.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', 'translate(0,' + $scope.mainChartHeight + ')')
          .append('text')
            .attr('x', $scope.width)
            .attr('dx', '-0.1em')
            .attr('dy', '-0.3em')
            .style('text-anchor', 'end')
            .text(axes.xAxis.desc);

        // Y Axis (main chart)
        $scope.svg.append('g')
            .attr('class', 'axis y-axis')
          .append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 6)
            .attr('dy', '.71em')
            .style('text-anchor', 'end')
            .text(axes.yAxis.desc);

        // Put the path to show in the main chart
        $scope.svg.append('path')
          .datum(data)
          .attr('class', 'line dataset-line');

        // Zoom
        $scope.zoomScale = 1;
        $scope.translateX = 0;
        $scope.zoom = d3.behavior.zoom().on('zoom', function() {
          var x;

          // if ($scope.xScale.domain()[0] < $scope.dataMinX) {
          //   x = $scope.zoom.translate()[0] - $scope.xScale($scope.dataMinX) + $scope.xScale.range()[0];
          //   $scope.zoom.translate([x, 0]);
          // } else if ($scope.xScale.domain()[1] > $scope.dataMaxX) {
          //   x = $scope.zoom.translate()[0] - $scope.xScale($scope.dataMaxX) + $scope.xScale.range()[1];
          //   $scope.zoom.translate([x, 0]);
          // }

          $scope.redrawPlot();

          // Update the viewport
          if ($scope.xScale.domain()[0] <= $scope.dataMinX && $scope.xScale.domain()[1] >= $scope.dataMaxX) {
            $scope.viewport.clear();
          } else {
            $scope.viewport.extent($scope.xScale.domain());
          }
          $scope.navSvg.select('.viewport').call($scope.viewport);
        });

        $scope.zoom.scaleExtent([Parameters.ASP_RATIO[0], Parameters.ASP_RATIO[1]]);
        $scope.svg.append('rect')
          .attr('class', 'pane')
          .attr('width', $scope.width + $scope.leftRightMargin)
          .attr('height', $scope.mainChartHeight + $scope.topBottomMargin)
          .call($scope.zoom);
        $scope.zoom.x($scope.xScale);

        // Viewport ---------------------------------------------------------
        
        $scope.navSvg = d3.select($element.find('> #navigator')[0])
            .attr('width', $scope.width + $scope.leftRightMargin)
            .attr('height', $scope.navigatorHeight + $scope.navigatorTopBottomMargin)
          .append('g')
            .attr('transform', 'translate(' + 
              Parameters.plotMargin.left + ',' + 
              Parameters.plotMargin.top + ')');

        // Navigator X Axis
        $scope.navSvg.append('g')
            .attr('class', 'axis x-axis')
            .attr('transform', 'translate(0,' + $scope.navigatorHeight + ')')
          .append('text')
            .attr('x', $scope.width)
            .attr('dx', '-0.1em')
            .attr('dy', '-0.3em')
            .style('text-anchor', 'end');

        // Dataset path
        $scope.navSvg.append('path')
          .datum(data)
          .attr('class', 'line dataset-line');

        // Brush
        $scope.viewport = d3.svg.brush()
          .x($scope.navXScale)
          .on('brush', function () {
            var s = d3.event.target.extent();
            if (axes.xAxis.type === 'date') {
              s[0] = s[0].getTime();
              s[1] = s[1].getTime();
            }

            if (d3.event.mode !== 'move') {
              var maxExtensionSize = $scope.dataMaxX - $scope.dataMinX;

              // Ignore when it is too small
              if (s[1] - s[0] < maxExtensionSize / Parameters.ASP_RATIO[1]) {
                if ($scope.zoomScale == Parameters.ASP_RATIO[1]) {
                  s[1] = s[0] + maxExtensionSize / $scope.zoomScale;
                } else {
                  s[1] = s[0];
                }

                // Update the changes we've done with the extent to the brush
                if (axes.xAxis.type === 'date') {
                  d3.event.target.extent([new Date(s[0]), new Date(s[1])]);
                } else {
                  d3.event.target.extent([s[0], s[1]]);
                }
                d3.event.target(d3.select(this));
                return;
              }

              $scope.zoomScale = (s[1] - s[0]) / maxExtensionSize; 

              // If the right part exceeds the maximum value for x, we translate everithing
              s[1] = s[0] + maxExtensionSize / $scope.zoomScale;
              if (s[1] > $scope.dataMaxX) {
                s[0] -= s[1] - $scope.dataMaxX;
                s[1] -= s[1] - $scope.dataMaxX;
              }

              // Update the changes we've done with the extent to the brush
              if ($scope.zoomScale <= 1) {
                // $scope.viewport.clear();
              } else {
                if (axes.xAxis.type === 'date') {
                  d3.event.target.extent([new Date(s[0]), new Date(s[1])]);
                } else {
                  d3.event.target.extent([s[0], s[1]]);
                }
              }
              d3.event.target(d3.select(this));

              // Update all the changes to the model so it can be correctly shown
              DatasetAPI.notifyChangeDataRepresentation($scope.seriesNum, $scope.smoothIteration, true);
              $scope.$apply(); // it is a non-angular event, so we need to apply changes

              $scope.zoom.scale($scope.zoomScale);
            } 

            $scope.xScale.domain($scope.viewport.empty() ? $scope.navXScale.domain() : $scope.viewport.extent());
            $scope.redrawPlot();
          })
          .on('brushend', function () {
            $scope.zoom.x($scope.xScale);
            var fullDomain = $scope.dataMaxX - $scope.dataMinX,
            currentDomain = $scope.xScale.domain()[1] - $scope.xScale.domain()[0];
            var minScale = currentDomain / fullDomain, maxScale = minScale * Parameters.ASP_RATIO[1];
            $scope.zoom.scaleExtent([minScale, maxScale]);
            $scope.redrawPlot();
          });

        $scope.navSvg.append('g')
          .attr('class', 'viewport')
          .call($scope.viewport)
          .selectAll('rect')
          .attr('height', $scope.navigatorHeight);

        // Update for the first time with the domain we have in the main chart
        $scope.zoom.scale($scope.zoomScale);
        $scope.viewport.extent($scope.xScale.domain());
        $scope.navSvg.select('.viewport').call($scope.viewport);

        // End Viewport ---------------------------------------------------------

        $scope.redrawPlot();
      });

      $scope.drawDebugLines = function (debugLines) {
        for (var i in debugLines) {
          var debugLine = debugLines[i];
          $scope.svg.append('path')
            .datum([
              {x: debugLine.x1, y: $scope.mainChartHeight - debugLine.y1}, 
              {x: debugLine.x2, y: $scope.mainChartHeight - debugLine.y2}
            ])
            .attr('class', 'debug-line')
            .attr('stroke', '#FF0000');
          $scope.redrawPlot();    
        }
      };

      $scope.drawLine = function (matchId, matchPoints, matchValueToDisplay) {
        var line = $scope.svg.append('path')
            .datum(matchPoints)
            .attr('data-match-id', matchId)
            .attr('class', 'line-match')
            .attr('stroke', Parameters.MATCH_LINE_COLOR(matchValueToDisplay));

        line.on('click', function() {
          var $results = $('.result-display');
          $results.removeClass('displaying');
          DatasetAPI.showMatches(matchId, null, null, null, null, true, null);
          d3.event.stopPropagation();
        });

        var firstPoint = matchPoints[0];
        $scope.svg.append('path')
          .datum([firstPoint, firstPoint])
          .attr('class', 'line-match')
          .attr('stroke', Parameters.MATCHES_SEPARATOR_COLOR(matchValueToDisplay));

        var lastPoint = _.last(matchPoints);
        $scope.svg.append('path')
          .datum([lastPoint, lastPoint])
          .attr('class', 'line-match')
          .attr('stroke', Parameters.MATCHES_SEPARATOR_COLOR(matchValueToDisplay));
      };

      $scope.updateScaleOfMatches = function () {
        $scope.svg.selectAll('path.line-match').attr('d', 
          d3.svg.line()
            .x(function(p) { return $scope.xScale(p.origX); })
            .y(function(p) { return $scope.yScale(p.origY); })
        );
        $scope.svg.selectAll('path.debug-line').attr('d', 
          d3.svg.line()
            .x(function(p) { return p.x; })
            .y(function(p) { return p.y; })
        );
      };

      $scope.updateScaleOfSmoothedDataset = function () {
        $scope.svg.select('path.smoothed-dataset-line').attr('d',
          d3.svg.line()
            .x(function(p) { return $scope.xScale(p.origX); })
            .y(function(p) { return $scope.yScale(p.origY); })
        );
      };

      $scope.redrawPlot = function () {
        $scope.svg.select('g.x-axis').call($scope.xAxis);
        $scope.svg.select('g.y-axis').call($scope.yAxis);
        $scope.svg.select('path.line').attr('d', $scope.line);

        $scope.navSvg.select('path.line').attr('d', $scope.navLine);
        $scope.navSvg.select('g.x-axis').call($scope.navXAxis);

        $scope.updateScaleOfSmoothedDataset();
        $scope.updateScaleOfMatches();
      };

    }
  };
}]);
