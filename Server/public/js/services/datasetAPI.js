var Dataset = angular.module('Dataset');

Dataset.service('DatasetAPI', ['$rootScope', 'Data_Utils', 'Dataset_Resource', 'Parameters', function($rootScope, Data_Utils, Dataset_Resource, Parameters) {
  var self = this;

  this.dataDefinition = []; // the definition of all the available datasets

  this.dataset = null; /* the current open dataset
     {
       key: datadef.key,
       desc: datadef.desc,
       xAxis: datadef.xAxis,
       yAxis: datadef.yAxis,
       relativeTime: datadef.relativeTime,
       series: [  // An array of all the loaded time series.
         {
            desc: 'test 1',
            snum: 't1',
            values: [{x: origX0, y: origY0}, {x: origX1, y: origY1}, ...]
         },
         ...
       ]
     }
  */

  this.data = []; /*
    An array where each position has a time series (e.g. the first is the MSFT stock prices, the second for APPL).
    Each time series is an array which contains all the smooth iterations of the same dataset: the first position
    contains the data itself (obtained scaling the rawData), the other position are reserved for the same dataset
    (as contained in data[0]), but iteratively smoothed, to remember where a query could have done a match.
  */

  this.matches = null;

  this.smoothedDataId = 0;

  this.displaySize = 0; // the width of the display to determine how is the aspect ratio of the user interface
  this.displayHeight = 0;

  this.updateDatasetDefinition = function () {
    var self = this;
    Dataset_Resource.definition(function (resp) {
      self.dataDefinition = resp.dataDefinition;
      $rootScope.$broadcast(Parameters.DATASET_EVENTS.DATASETS_DEFINITION_LOADED, resp.dataDefinition);
    });
  };

  /**
   * Load a dataset
   * @param key specified the key to load
   * @param snum specifies the snum series to load, can be undefinded or null if all one wants to load all the time series
   *             of that particular key
   */
  this.loadDataSet = function (key, snum) {
    var i, j, series;

    this.clear();

    for (i in this.dataDefinition) {
      var datadef = this.dataDefinition[i];
      if (datadef.key !== key) continue;
      this.dataset = {
        key: datadef.key,
        desc: datadef.desc,
        xAxis: datadef.xAxis,
        yAxis: datadef.yAxis,
        relativeTime: datadef.relativeTime,
        series: []
      };

      // Determines the data to be loaded
      for (j in datadef.series) {
        series = datadef.series[j];
        if (snum) {
          if (series.snum !== snum) continue;
          this.dataset.desc += ': ' + series.desc;
        }
        this.dataset.series.push(series);
      }

      // Loads the data from the server
      async.each(this.dataset.series, function (series, it) {
        Dataset_Resource.get({key: key, snum: series.snum}, function (data) {
          series.values = data.values;
          it();
        });
      }, function () {

        // Call the UI to notify that all the data has been loaded
        self.updateDataForDisplaySize();
        $rootScope.$broadcast(Parameters.DATASET_EVENTS.DATASET_LOADED, self.dataset);
        self.notifyDataChanged();
        self.notifyChangeDataRepresentation();

      });

    }
  };

  /**
   * Given the series id it returns the position in the array of that time series
   */
  this.getSeriesNum = function (seriesId) {
    for (var i = 0; i < this.dataset.series.length; i++) {
      if (this.dataset.series[i].snum === seriesId) return i;
    }
  };
  
  /* It notify that the data has been changed; the first dataset will be shown */
  this.notifyDataChanged = function (seriesNum) {
    if (seriesNum === undefined) seriesNum = 0;
    $rootScope.$broadcast(
      Parameters.DATASET_EVENTS.DATA_CHANGED,
      seriesNum,
      this.dataset.series[seriesNum].values,
      {xAxis: this.dataset.xAxis, yAxis: this.dataset.yAxis}
    );
  };

  /**
   * Notify that a particular smooth iteration of the dataset must be shown.
   * The data passed as argument are scaled to be correctly displayed 
   */
  this.notifyChangeDataRepresentation = function (seriesNum, smoothedDataId, handled) {
    if (seriesNum === undefined) seriesNum = 0;
    if (smoothedDataId === undefined) smoothedDataId = 0;
    this.smoothedDataId = smoothedDataId;
    $rootScope.$broadcast(Parameters.DATASET_EVENTS.DATA_REPRESENTATION_CHANGED, this.data[seriesNum][smoothedDataId], smoothedDataId, handled);
  };

  /** 
   * Notify that some matches has to be shown. The data passed as argument are scaled to be correctly displayed.
   * - i can be null, and all the matches in the specified smoothIteration are shown
   * - smoothIteration can be also null, and all the matches are shown
   * - minimumMatch is the minimum match value to show
   */
  this.notifyMatchesChanged = function (i) {
    $rootScope.$broadcast(Parameters.DATASET_EVENTS.MATCHES_CHANGED, this.matches, i);
  };

  /**
   * Show the matches that have the specified requirements:
   * idx: if not null is used to specify the exact match to show
   * smoothedDataId: if not null is used to specify the exact smooth iteration where it needs to show the data
   */
  this.showMatches = function (idx, smoothedDataId, seriesNum, minimumMatch, maximumMatch, highlightInMatchesList, feedback) {
    var i, matchesToShow = [];

    if (idx !== null) {
      matchesToShow.push(this.matches[idx]);
    } else {
      for (i in this.matches) {
        var match = this.matches[i];
        if (smoothedDataId !== null && match.smoothIteration !== smoothedDataId) continue;
        if (seriesNum !== null && match.snum !== seriesNum) continue;
        if (feedback !== null) {
          if (match.feedback < 0 && feedback) continue;
          if (match.feedback > 0 && !feedback) continue;
        }

        // Don't show matches that are greater or less than the specified boundaries
        if (minimumMatch !== null && 
            maximumMatch !== null &&
            (match.match < minimumMatch || match.match > maximumMatch)) continue;

        matchesToShow.push(match);
      }
    }

    $rootScope.$broadcast(Parameters.DATASET_EVENTS.SHOW_MATCHES, matchesToShow, idx, smoothedDataId, minimumMatch, maximumMatch, highlightInMatchesList);
  };

  this.showDataRepresentation = function (seriesNum, smoothedDataId) {
    if (smoothedDataId === undefined || smoothedDataId < 0) smoothedDataId = 0;
    if (smoothedDataId >= this.data[seriesNum].length) smoothedDataId = this.data[seriesNum].length - 1;
    this.smoothedDataId = smoothedDataId;

    this.notifyChangeDataRepresentation(seriesNum, smoothedDataId);

    // return back the possible corrections to the caller
    return {
      smoothId: smoothedDataId
    };
  };


  /* Set the data as they appears in the screen (the real data where the query is searched).
   * This are the rawdata, but scaled by the viewer.
   *
   * For example a function y = x + 1, represented in x = {1,2,3,4}, in a plot with a width = 1000px,
   * and height = 500px
   *
   * has rawData = [
   *   {x: 1, y: 2},
   *   {x: 2, y: 3},
   *   {x: 3, y: 4},
   *   {x: 4, y: 5},
   * ]
   *
   * and data = [
   *   {x: 0, y: 0},
   *   {x: 333, y: 166},
   *   {x: 666, y: 332},
   *   {x: 1000, y: 500},
   * ]
   */
  this.updateDataForDisplaySize = function () {
    console.log('updateDataForDisplaySize');
    if (this.dataset === null) {
      return;
    }

    // scale data so it will have the same aspect ratio of the user screen
    for (var i = 0; i < this.dataset.series.length; i++) {
      var xScale = this.dataset.xAxis.type === 'date' ?
        d3.time.scale().range([0, this.displaySize.width]) :
        d3.scale.linear().range([0, this.displaySize.width]);
      var yScale = d3.scale.linear().range([this.displaySize.height, 0]);
      xScale.domain(d3.extent(this.dataset.series[i].values, function (p) { return p.x; }));
      yScale.domain(d3.extent(this.dataset.series[i].values, function (p) { return p.y; }));
      this.data[i] = [
        _.map(this.dataset.series[i].values, function (el) {
          return new Qetch.Point(xScale(el.x), self.displaySize.height - yScale(el.y), el.x, el.y);
        })
      ];

      // update smooth iterations
      Data_Utils.smoothData(this.data[i],
        Parameters.SMOOTH_MINIMUM_SIGN_VARIATIONS_NUM,
        Parameters.SMOOTH_MIN_SIGN_VARIATION_RATIO,
        undefined,
        Parameters.SMOOTH_SMOOTHED_HEIGHT_HEIGHT_MIN_RATIO);
      this.displayHeight = Data_Utils.dataHeight(this.data[i][0]);
    }
  };

  this.setDisplaySize = function (width, height) {
    this.displaySize = {width: width, height: height};
    this.updateDataForDisplaySize();
  };

  this.getDatasetsNum = function () {
    return this.data.length;
  };

  this.getSmoothIterationsNum = function (seriesNum) {
    return this.data[seriesNum].length;
  };

  this.getData = function (seriesNum, smoothedDataId) {
    if (smoothedDataId === undefined) return this.data[seriesNum][0];
    return this.data[seriesNum][smoothedDataId];
  };

  this.getDataDefinitionSeries = function (key) {
    for (var i in this.dataDefinition) {
      if (this.dataDefinition[i].key == key) {
        return this.dataDefinition[i].series;
      }
    }
  };

  this.getPointsFromInterval = function (snum, smoothIteration, minPos, maxPos, windowPerc, origX) {
    var points = this.data[snum][smoothIteration];
    var size = maxPos - minPos + 1;
    var extractedPoints = [];
    for (var i = 0; i < points.length; i++) {
      if (origX) {
        if (points[i].origX >= minPos - size * windowPerc) {
          if (points[i].origX > maxPos + size * windowPerc) break;
          var newPts = {x: points[i].x, y: points[i].y};
          if (windowPerc !== undefined && windowPerc !== null && windowPerc > 0) {
            newPts.marker = !!(points[i].origX >= minPos && points[i].origX <= maxPos);
          }
          extractedPoints.push(newPts);
        }
      } else {
        if (points[i].x >= minPos - size * windowPerc) {
          if (points[i].x > maxPos + size * windowPerc) break;
          var newPts = {x: points[i].x, y: points[i].y};
          if (windowPerc !== undefined && windowPerc !== null && windowPerc > 0) {
            newPts.marker = !!(points[i].x >= minPos && points[i].x <= maxPos);
          }
          extractedPoints.push(newPts);
        }
      }
    }
    return extractedPoints;
  };

  // Transforms a list of points in a string format in a real list of points
  this.pointsListToPointArray = function (ptsStr) {
    var ptsStrLst = ptsStr.substring(1, ptsStr.length - 1).split(')(');
    var ptsLst = [];
    for (var j = 0; j < ptsStrLst.length; j++) {
      var pts = ptsStrLst[j].split(',');
      var x = parseFloat(pts[0]);
      var y = parseFloat(pts[1]);
      var pt = new Qetch.Point(x, y, x, y);
      ptsLst.push(pt);
    }
    return ptsLst;
  };

  this.pointArrayToPointsList = function (pts, markers) {
    var ptsStr = '';
    for (var i = 0; i < pts.length; i++) {
      ptsStr += '(' + pts[i].x + ',' + pts[i].y + (markers ? (pts[i].marker ? ',1' : ',0') : '') + ')';
    }
    return ptsStr;
  };

  this.clear = function() {
    this.dataset = null;
    this.data = [];
    this.matches = null;
    this.smoothedDataId = 0;
  };

  /**
   * Used to display the matches. 
   * @param {array of matches} matches an array of matches in this form:
   *                  [{match: 0.334234, points: [{x:23,y:32}, ...]}, ...]
   *                  Where 0 is a perfect match, and the higher is the match and the weaker is the match
   */
  this.setMatches = function (matches) {
    this.matches = matches;
  };

  this.clearMatches = function () {
    this.matches = null;
  };

  /* -------------------------------------------
   * DEBUG functions 
   * ------------------------------------------- */
  document.getTopKResults = function (k) {
    var topKRes = [];
    var ordMatches = _.sortBy(self.matches, 'match');
    for (var i = 0; i < k && i < ordMatches.length; i++) {
      topKRes.push(ordMatches[i]);
    }
    return topKRes;
  };
  document.checkResultIn = function (positions) {
    var totalResults = self.matches.length;
    var ordMatches = _.sortBy(self.matches, 'match');
    var ordMatchesScores = [];
    var match = null;
    for (var pi = 0; pi < positions.length; pi++) {
      var xStart = positions[pi].start;
      var xEnd = positions[pi].end;
      var xAprxRng = (xEnd - xStart) / 100 * 25;

      for (var i = 0; i < ordMatches.length; i++) {
        ordMatchesScores[i] = ordMatches[i].match;
      }

      for (var i = 0; i < ordMatches.length; i++) {
        var mtcStart = ordMatches[i].points[0].origX;
        var mtcEnd = ordMatches[i].points[ordMatches[i].points.length - 1].origX;
        if (mtcStart > xStart - xAprxRng &&
          mtcStart < xStart + xAprxRng &&
          mtcEnd < xEnd + xAprxRng &&
          mtcEnd > xEnd - xAprxRng) {
          if (match === null || match.matchValue > ordMatches[i].match) {
            match = {
              position: i,
              matchValue: ordMatches[i].match,
              scores: ordMatchesScores,
              noResults: totalResults,
              timespan: ordMatches[i].timespan.value / (1000*60*60*24) // in days
            };
          }
        }
      }
    }
    return match;
  };
  document.getBoundOf = function (id) {
    for (var i in self.matches) {
      if (self.matches[i].id === id)
        console.log({id: id,
          start: self.matches[i].points[0].origX,
          end: self.matches[i].points[self.matches[i].points.length - 1].origX});
    }
  };
  document.getErrorsOf = function (id) {
    for (var i in self.matches) {
      if (self.matches[i].id === id) {
        var errorsStr = '';
        var errors = self.matches[i].errors;
        for (var ei in errors) {
          errorsStr += 'cx: ' + errors[ei].cx.toFixed(2) + ' cy: ' + errors[ei].cy.toFixed(2) + '\n';
        }
        console.log('errors:\n' + errorsStr);
      }
    }
  };
  document.getDataAllSmooths = function (start, end) {
    var data = self.data[0];
    var points = '';
    for (var i = 0; i < data.length; i++) {
      points += self.pointArrayToPointsList(self.getPointsFromInterval(0, i, start, end, 0.5, true), true) + '§' +
        self.pointArrayToPointsList(self.getPointsFromInterval(0, i, start, end, 0, true), true) + '\n';
    }
    return points;
  };
  document.getDataPoints = function () {
    return self.data[0][0].length;
  };
  /* -------------------------------------------
   * END DEBUG functions 
   * ------------------------------------------- */

}]);