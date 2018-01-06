var QetchQueryDrawRefining = angular.module('QetchQuery');

QetchQueryDrawRefining.service('QetchQuery_DrawRefining', ['$rootScope', 'DatasetAPI', 'QetchQuery_QueryAPI', 'Queries_Resource', 'Parameters',
    function ($rootScope, DatasetAPI, QetchQuery_QueryAPI, Queries_Resource, Parameters) {
  var self = this;

  this.predefinedQueries = null;
  this.queryHistory = [];

  this.queryFunctions = [];

  Queries_Resource.predefinedQueries(function (data) {
    self.predefinedQueries = [];
    for (var i = 0; i < data.length; i++) {
      var ptsLst = DatasetAPI.pointsListToPointArray(data[i]);
      var bounds = self.pointsBounds(ptsLst);
      self.predefinedQueries.push({
        points: ptsLst,
        bounds: bounds
      });
    }

    $rootScope.$broadcast(Parameters.QUERY_REFINEMENT_EVENTS.PREDEFINED_QUERIES_LOADED, self.predefinedQueries);
  });

  Queries_Resource.fnQueries(function (data) {
    self.queryFunctions = [];
    for (var i = 0; i < data.length; i++) {
      data[i].f = new Function('constants', 'x', data[i].f);
      self.queryFunctions.push(data[i]);
    }
  });

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

  this.queryUpdated = function (points) {
    var qtangents = QetchQuery_QueryAPI.extractTangents(points);
    var qsections = QetchQuery_QueryAPI.findCurveSections(qtangents, points, Parameters.DIVIDE_SECTION_MIN_HEIGHT_QUERY);
    this.addQueryInHistory({points: points, bounds: this.pointsBounds(points), tangents: qtangents, sections: qsections});

    var predefinedQuery = this.searchPredefinedQueryPattern(qsections);
    var queryFnSuggestion = this.analyzeQueryPattern(points, qtangents, qsections);

    if (predefinedQuery !== null && queryFnSuggestion !== null) {
      if (predefinedQuery.matchValue < queryFnSuggestion.matchValue) queryFnSuggestion = null;
      else predefinedQuery.id = null;
    }

    $rootScope.$broadcast(Parameters.QUERY_REFINEMENT_EVENTS.SUGGEST_PREDEFINED_QUERY, predefinedQuery === null ? null : predefinedQuery.id);
    $rootScope.$broadcast(Parameters.QUERY_REFINEMENT_EVENTS.QUERY_FN_SUGGESTION, queryFnSuggestion);
  };

  this.searchPredefinedQueryPattern = function (qsections) {
    var minMatchValue = Number.MAX_VALUE, minMatchId = null;
    for (var i = 0; i < this.predefinedQueries.length; i++) {
      var pquery = this.predefinedQueries[i];
      if (pquery.tangents === undefined) pquery.tangents = QetchQuery_QueryAPI.extractTangents(this.predefinedQueries[i].points);
      if (pquery.sections === undefined) pquery.sections = QetchQuery_QueryAPI.findCurveSections(pquery.tangents, this.predefinedQueries[i].points, Parameters.DIVIDE_SECTION_MIN_HEIGHT_QUERY);
      if (qsections.length !== pquery.sections.length) continue;

      var match = QetchQuery_QueryAPI.calculatePointsMatch(qsections, pquery.sections, false);
      if (match !== null && minMatchValue > match.match) {
        minMatchValue = match.match;
        minMatchId = i;
      }
    }

    if (minMatchValue > Parameters.MIN_MATCH_VALUE_FOR_PREDEFINED_QUERY * qsections.length) return null;

    return {id: minMatchId, matchValue: minMatchValue};
  };

  this.addQueryInHistory = function (query) {
    this.queryHistory.push(query);
    $rootScope.$broadcast(Parameters.QUERY_REFINEMENT_EVENTS.QUERY_HISTORY_UPDATE, this.queryHistory);
  };

  // get the bounds of a list of points
  this.pointsBounds = function (points) {
    var bounds = {
      minY: Number.MAX_SAFE_INTEGER,
      minX: Number.MAX_SAFE_INTEGER,
      maxY: Number.MIN_SAFE_INTEGER,
      maxX: Number.MIN_SAFE_INTEGER
    };
    for (var j = 0; j < points.length; j++) {
      var pt = points[j];
      if (bounds.minX > pt.x) bounds.minX = pt.x;
      if (bounds.maxX < pt.x) bounds.maxX = pt.x;
      if (bounds.minY > pt.y) bounds.minY = pt.y;
      if (bounds.maxY < pt.y) bounds.maxY = pt.y;
    }
    return bounds;
  };

  this.analyzeQueryPattern = function (qpoints, qtangents, qsections) {
    var res = this.analyzeQueryPatternWithFn(qpoints, qtangents, qsections);
    return (res.matchValue <= Parameters.MIN_MATCH_VALUE_FOR_PREDEFINED_QUERY * qsections.length) ? res : null;
  };

  this.generatePointsForFn = function (fnDescr, cons) {
    var fpoints = [];
    for (var x = fnDescr.range[0]; x < fnDescr.range[1]; x += fnDescr.samplingStep) {
      var y = fnDescr.f(cons, x);
      fpoints.push(new Qetch.Point(x + fnDescr.xOffset, y, x + fnDescr.xOffset, y));
    }
    return fpoints;
  };

  this.analyzeQueryPatternWithFn = function (qpoints, qtangents, qsections) {
    var maxMatch = {
      matchValue: Number.MAX_VALUE,
      cons: {},
      fn: null,
      points: []
    };

    for (var fi = 0; fi < this.queryFunctions.length; fi++) {
      var fnDescr = this.queryFunctions[fi];
      if (fnDescr.maxSecNum < qsections.length) continue;

      for (var ci = 0; ci < fnDescr.cons.length; ci++) {
        var cons = fnDescr.cons[ci];
        var fpoints = this.generatePointsForFn(fnDescr, cons);
        var ftangents = QetchQuery_QueryAPI.extractTangents(fpoints);
        var fsections = QetchQuery_QueryAPI.findCurveSections(ftangents, fpoints, Parameters.DIVIDE_SECTION_MIN_HEIGHT_QUERY);

        if (qsections.length != fsections.length) continue;

        var match = QetchQuery_QueryAPI.calculatePointsMatch(qsections, fsections, true);
        if (match !== null && match.match < maxMatch.matchValue) {
          maxMatch.matchValue = match.match;
          maxMatch.cons = cons;
          maxMatch.fn = fnDescr;
          maxMatch.points = fpoints;
        }
      }
    }
    return maxMatch;
  };
  

}]);  