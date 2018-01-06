var QetchQuery = angular.module('QetchQuery');

QetchQuery.service('QetchQuery_QueryAPI', ['$rootScope', 'DatasetAPI', 'Data_Utils', 'Parameters', function ($rootScope, DatasetAPI, Data_Utils, Parameters) {
  var self = this;

  this.points = []; // all the extracted point of the query
  this.tangents = []; // all the tangents of the query
  this.sections = []; // all the sections of the query
  this.notOperator = -1; // -1 means false, any other positive number means that the operation should be negated using
                         // that treshold
  this.queryLength = null;
  this.queryLengthTolerance = null;
  this.queryHeight = null;
  this.queryHeightTolerance = null;
  this.queryHorizontalOffset = null;
  this.queryVerticalOffset = null;

  this.isEmpty = function () {
    return this.points.length === 0;
  };

  this.clear = function () {
    this.points = [];
    this.tangents = [];
    this.sections = [];
    this.notOperator = -1;
    DatasetAPI.clearMatches();
    $rootScope.$broadcast(Parameters.QUERY_EVENTS.CLEAR);
  };

  this.setPoints = function (points) {
    this.points = points;
    // console.log('Query points:', this.points.length);
    this.tangents = this.extractTangents(points);
    this.sections = this.findCurveSections(this.tangents, points, Parameters.DIVIDE_SECTION_MIN_HEIGHT_QUERY);
    // console.log('Query sections:', this.sections.length);
    this.findMatches();
  };

  this.findMatches = function () {
    // if (Parameters.QSMOOTH) {
    //   var query = [this.points];
    //   Data_Utils.smoothData(query,
    //     Parameters.QSMOOTH_MINIMUM_SIGN_VARIATIONS_NUM,
    //     Parameters.QSMOOTH_MIN_SIGN_VARIATION_RATIO,
    //     Parameters.QSMOOTH_MINIMUM_SECT_RELATIVE_WITH_MAX_RATIO);
    //   console.log(query);

    //   this.tangents = this.extractTangents(_.last(query));
    //   this.sections = this.findCurveSections(this.tangents, points);
    // }

    // DEBUG --------
    Parameters.LAST_EXECUTION_QUERY_LENGTH = this.queryLength;
    // DEBUG --------

    var matches;
    if (Parameters.ALGORITHM_TO_USE == 'dtw' || Parameters.ALGORITHM_TO_USE == 'ed') {
      // matches = this.queryLength ? this.executeQueryVDTWorVED() : this.executeQueryDTWorED();
      matches = this.queryLength ? this.executeQueryVDTWorVED() : [];
    } else {
      matches = this.executeQuery();
    }

    DatasetAPI.setMatches(matches);
    DatasetAPI.notifyMatchesChanged();
  };
  
  this.setQueryLength = function (queryLength, tolerance, strictMode) {
    this.queryLength = queryLength;
    this.queryLengthTolerance = tolerance;
    this.queryLengthStrictMode = strictMode;
  };

  this.setQueryHeight = function (queryHeight, tolerance) {
    this.queryHeight = queryHeight;
    this.queryHeightTolerance = tolerance;
  };

  this.setQueryHorizontalOffset = function (queryHorizontalOffset) {
    this.queryHorizontalOffset = queryHorizontalOffset;
  };

  this.setQueryVerticalOffset = function (queryVerticalOffset) {
    this.queryVerticalOffset = queryVerticalOffset;
  };

  /**
   * Execute the query
   * This only see the smooth. Then launch the executeQueryRec
   * It then notify the results
   */
  this.executeQuery = function () {
    var startingTime = new Date();

    var queryCtx = {
      matches: [],
      notMatches: [],
      snum: 0,
      smoothi: 0,
      notOperator: this.notOperator,
      notOperatorVal: -1,
      datasetSize: null,
      dataPoints: []
    };

    queryCtx.datasetSize = null;

    for (queryCtx.snum = 0; queryCtx.snum < DatasetAPI.getDatasetsNum(); queryCtx.snum++) {
      var smoothIterationsNum = DatasetAPI.getSmoothIterationsNum(queryCtx.snum);
      if (smoothIterationsNum === 0) throw 'No data to query'; // should be controlled by the UI
      for (queryCtx.smoothi = 0; queryCtx.smoothi < smoothIterationsNum; queryCtx.smoothi++) {
      // for (queryCtx.smoothi = 3; queryCtx.smoothi <= 3; queryCtx.smoothi++) {
      // for (queryCtx.smoothi = 0; queryCtx.smoothi <= 0; queryCtx.smoothi++) {
        queryCtx.dataPoints = DatasetAPI.getData(queryCtx.snum, queryCtx.smoothi);
        this.executeQueryInSI(queryCtx);
      }
    }

    var finishingTime = new Date();
    Qetch.DEBUG_LAST_EXECUTING_TIME = finishingTime - startingTime;

    return this.notOperator >= 0 ? queryCtx.notMatches : queryCtx.matches;
  };

  /**
   * Execute the query in a particular smooth iteration
   */
  this.executeQueryInSI = function (queryCtx) {
    var dsi;

    if (queryCtx.datasetSize === null) {
      queryCtx.datasetSize = _.last(queryCtx.dataPoints).x - queryCtx.dataPoints[0].x;
    }
    var dataTangents = this.extractTangents(queryCtx.dataPoints);
    var dataSections = this.findCurveSections(dataTangents, queryCtx.dataPoints, Parameters.DIVIDE_SECTION_MIN_HEIGHT_DATA);

    for (dsi = 0; dsi < dataSections.length; dsi++) {
      for (var i = 0; i < this.sections.length; i++) {
        for (var j = 0; j < this.sections[i].next.length; j++) {
          this.sections[i].next[j].times = 1;
        }
      }
      if (this.matchIn(this.sections[0], dataSections, dsi, [], queryCtx, _.last(this.sections)) === false) break;
    }

    if (this.notOperator >= 0) {
      if (this.notOperator == 0) { // auto calculate value
        var avgMatchValue = 0, avgMatchValueCount = 0;
        for (var i = 0; i < queryCtx.matches.length; i++) {
          var mtc = queryCtx.matches[i];
          if (mtc.smoothIteration !== queryCtx.smoothi) continue;
          avgMatchValue += mtc.match;
          avgMatchValueCount++;
        }
        avgMatchValue = avgMatchValue / avgMatchValueCount;
        queryCtx.notOperatorVal = avgMatchValue * 1.2;
      } else {
        queryCtx.notOperatorVal = queryCtx.notOperator;
      }
      this.findNotMatches(dataSections, queryCtx);
    }
  };

  /**
   * Iterates the matches and the sections to find the
   * @param dataSections the sections. This array is modified settings NULL values in it
   * @param queryCtx query context information, the place where the NOT matches are stored
   */
  this.findNotMatches = function (dataSections, queryCtx) {
    var dsi, i, msi, currentSections = [];

    // it changes the dataSections array setting to null the sections that are detected in a match
    for (dsi = 0; dsi < dataSections.length; dsi++) {
      var sec = dataSections[dsi];
      for (i = 0; i < queryCtx.matches.length; i++) {
        var mtc = queryCtx.matches[i];
        if (mtc.smoothIteration !== queryCtx.smoothi) continue;
        if (mtc.match >= queryCtx.notOperatorVal) {
          continue;
        }
        for (msi = 0; msi < mtc.sections.length; msi++) {
          if (mtc.sections[msi] == sec) {
            dataSections[dsi] = null;
            break;
          }
        }
      }
    }

    var currentSINotMatches = [];
    for (dsi = 0; dsi < dataSections.length; dsi++) {
      if (dataSections[dsi] !== null) {
        currentSections.push(dataSections[dsi]);
      } else {
        if (currentSections.length > 0 && currentSections.length / dataSections.length < Parameters.NOT_OPERATOR_MAX_RELATIVE_LENGTH) {
          this.createNotMatch(currentSections, currentSINotMatches, queryCtx);
          currentSections.length = 0; // clear the array
        }
      }
    }
    if (currentSections.length > 0 && currentSections.length / dataSections.length < Parameters.NOT_OPERATOR_MAX_RELATIVE_LENGTH) {
      this.createNotMatch(currentSections, currentSINotMatches, queryCtx);
      currentSections.length = 0; // clear the array
    }

    for (i = 0; i < currentSINotMatches.length; i++) {
      currentSINotMatches[i].match = currentSINotMatches.length;
    }

  };

  this.createNotMatch = function (sections, currentSINotMatches, queryCtx) {
    var matchedPts = [];
    for (var si = 0; si < sections.length; si++) {
      for (var pi = 0; pi < sections[si].points.length; pi++) {
        matchedPts.push(sections[si].points[pi]);
      }
    }

    var newNotMatch = {
      id: queryCtx.notMatches.length,
      snum: queryCtx.snum,
      smoothIteration: queryCtx.smoothi,
      match: -1,
      size: (_.last(matchedPts).x - matchedPts[0].x) / queryCtx.datasetSize,
      timespan: this.calculateMatchTimeSpan(matchedPts[0], _.last(matchedPts)),
      points: matchedPts
    };

    queryCtx.notMatches.push(newNotMatch);
    currentSINotMatches.push(newNotMatch);
  };

  this.matchIn = function (currSect, dataSections, dsi, qSections, queryCtx, lastQuerySect) {
    if (qSections.length > Parameters.MAX_REGEX_IT) return false;
    var matchValue, i, sectsBlock = [currSect];

    // Translate the query that is always in a regexp-form (even when there are no repetitions) in an array of sections
    // This until there is only one next element
    while (currSect.next.length === 1 && currSect != lastQuerySect) {
      currSect = currSect.next[0].dest;
      sectsBlock.push(currSect);
    }

    if (dsi + sectsBlock.length + qSections.length > dataSections.length)
      return false; // the next group is too long for the remaining data sections

    // translate the new sections in case of repetitions
    if (qSections.length > 0) {
      /* TODO if slow could be useful to have a cache (the key could be based on the sections id) to avoid those copies */
      var lastQSectionsSectPt = _.last(_.last(qSections).points), firstSectsBlockPt = sectsBlock[0].points[0];
      if (firstSectsBlockPt.x < lastQSectionsSectPt.x) {
        var offset = - firstSectsBlockPt.x + lastQSectionsSectPt.x;
        var offseto = - firstSectsBlockPt.origX + lastQSectionsSectPt.origX;
        for (i = 0; i < sectsBlock.length; i++) {
          sectsBlock[i] = sectsBlock[i].translateXCopy(offset, offseto);
        }
      }
    }
    var newQSections = qSections.concat(sectsBlock);

    // DEBUG
    // var sxs = [], sids = [];
    // for (i = 0; i < newQSections.length; i++) {
    //   sids.push(newQSections[i].id);
    //   for (var j = 0; j < newQSections[i].points.length; j++) {
    //     sxs.push(parseInt((newQSections[i].points[j].x).toFixed(2)));
    //   }
    // }
    // // console.log('x: ', sxs);
    // console.log('ids: ', sids);

    var dataSectsForQ = dataSections.slice(dsi, dsi + newQSections.length);

    // If we reached the end of the query we can actually use it
    if (currSect == lastQuerySect &&
      (currSect.next.length === 0 || !currSect.next[0].size || currSect.next[0].size == currSect.next[0].times)) {
      matchValue = this.calculateMatch(dataSectsForQ, newQSections, queryCtx, false);
      if (matchValue !== null) {

        // Keep only one (best) match if the same area is selected in different smooth iterations
        var duplicateMatchIdx = Parameters.REMOVE_EQUAL_MATCHES ? this.searchEqualMatch(matchValue, queryCtx.matches) : -1;
        if (duplicateMatchIdx === -1) {
          matchValue.id = queryCtx.matches.length; // new id for the new match
          queryCtx.matches.push(matchValue);
        } else if (queryCtx.matches[duplicateMatchIdx].match > matchValue.match) {
          matchValue.id = queryCtx.matches[duplicateMatchIdx].id; // we leave the old id for the match
          queryCtx.matches[duplicateMatchIdx] = matchValue;
        }

      }
    }

    if (currSect.next.length >= 1) {
      var backLink = false;
      for (i = currSect.next.length - 1; i >= 0; i--) { // iterate repetitions and after the straight link
        var next = currSect.next[i];
        if (currSect == lastQuerySect || i > 0) { // it is a back link
          if (!next.size) {
            this.matchIn(next.dest, dataSections, dsi, newQSections, queryCtx, lastQuerySect);
          } else if (next.times < next.size) {
            next.times++;
            backLink = true; //exclude the straight link only if there is a strict repetition
            this.matchIn(next.dest, dataSections, dsi, newQSections, queryCtx, lastQuerySect);
          }
        } else if (!backLink) {
          this.matchIn(next.dest, dataSections, dsi, newQSections, queryCtx, lastQuerySect);
        }
      }
    }

  };

  /**
   *
   * @param matchedSections
   * @param querySections
   * @param queryCtx
   * @param partialQuery if true it will not return any information about the match, only its match value.
   *                     With partial query also the query length is not checked
   */
  this.calculateMatch = function (matchedSections, querySections, queryCtx, partialQuery) {
    var pointsMatchRes = this.calculatePointsMatch(querySections, matchedSections, partialQuery);
    if (pointsMatchRes === null) return null;
    if (pointsMatchRes.match > Parameters.MATCH_METRIC_MAXIMUM_VALUE) return null;
    if (!this.queryLengthStrictMode && partialQuery) return { match: pointsMatchRes.match };

    var matchedPts = pointsMatchRes.matchedPoints;
    var minPos = matchedPts[0].x;
    var maxPos = _.last(matchedPts).x;
    var matchSize = (maxPos - minPos) / queryCtx.datasetSize;
    var matchPos = ((maxPos + minPos) / 2) / queryCtx.datasetSize;
    var matchTimeSpan = this.calculateMatchTimeSpan(matchedPts[0], _.last(matchedPts));

    if (this.queryLengthStrictMode && !this.checkQueryLength(matchTimeSpan.value)) return null;

    if (this.queryHeight !== null) {
      if (!this.checkQueryHeight(this.calculateMatchHeight(matchedPts))) return null;
    }

    if (this.queryHorizontalOffset) {
      if (this.queryHorizontalOffset.min > 0) {
        if (matchedPts[0].origX < this.queryHorizontalOffset.min) return null;
      }

      if (this.queryHorizontalOffset.max > 0) {
        if (_.last(matchedPts).origX > this.queryHorizontalOffset.max) return null;
      }
    }

    if (this.queryVerticalOffset) {
      if (this.queryVerticalOffset.min > 0) {
        var minY = _.min(matchedPts, 'y').origY;
        if (minY < this.queryVerticalOffset.min) return null;
      }

      if (this.queryVerticalOffset.max > 0) {
        var maxY = _.max(matchedPts, 'y').origY;
        if (maxY > this.queryVerticalOffset.max) return null;
      }
    }


    if (partialQuery) return { match: pointsMatchRes.match };

    return {
      snum: queryCtx.snum,
      smoothIteration: queryCtx.smoothi,
      match: pointsMatchRes.match,
      size: matchSize,
      matchPos: matchPos,
      timespan: matchTimeSpan,
      points: matchedPts,
      minPos: minPos,
      maxPos: maxPos,
      sections: matchedSections,
      debugLines: pointsMatchRes.debugLines,
      errors: pointsMatchRes.errors
    };
  };

  /* Searches for the query compatibility. Returns false in case the query is not compatible to the given data. */
  this.areCompatibleSections = function (querySections, dataSections, checkLength) {
    if (querySections.length != dataSections.length) {
      // console.log('not same size query and dataSections');
      return false;
    }

    if (this.queryLength !== null && checkLength) {
      var lastDataSection = _.last(dataSections);
      var maxMatchLength = _.last(lastDataSection.points).origX - dataSections[0].points[0].origX +
        this.queryLength * this.queryLengthTolerance;
      var minMatchLength = (dataSections.length == 1 ? 0 : lastDataSection.points[0].origX - _.last(dataSections[0].points).origX) -
        this.queryLength * this.queryLengthTolerance;
      if (this.queryLength > maxMatchLength || this.queryLength < minMatchLength) return false;
    }

    var incompatibleSections = 0;
    for (var j = 0; j < querySections.length; j++) {
      if (querySections[j].sign !== 0 && querySections[j].sign != dataSections[j].sign) incompatibleSections++;
    }
    return incompatibleSections / querySections.length <= Parameters.QUERY_SIGN_MAXIMUM_TOLERABLE_DIFFERENT_SIGN_SECTIONS;
  };

  this.getBounds = function (sections, startSectIdx, endSectIdx) {
    if (sections === null) return null;
    var bounds = {
      minX: Number.MAX_SAFE_INTEGER, maxX: Number.MIN_SAFE_INTEGER,
      minY: Number.MAX_SAFE_INTEGER, maxY: Number.MIN_SAFE_INTEGER
    };
    bounds.minX = sections[startSectIdx].points[0].x;
    bounds.maxX = _.last(sections[endSectIdx].points).x;
    for (var i = startSectIdx; i < endSectIdx; i++) {
      var localMinY = _.min(sections[i].points, 'y').y;
      var localMaxY = _.max(sections[i].points, 'y').y;
      if (localMinY < bounds.minY) bounds.minY = localMinY;
      if (localMaxY > bounds.maxY) bounds.maxY = localMaxY;
    }
    return bounds;
  };

  // reduce the number of sections to n, joining the smallest sections to the smallest adjacent
  this.reduceSections = function (sections, n) {
    var i;
    if (n >= sections.length || n < 1) return sections;
    // if (n < sections.length + 1) return null;
    var newSections = [];
    for (i = 0; i < sections.length; i++) newSections.push(sections[i].copy());

    while (n < newSections.length) {
      var smallestSection = null;
      var sectionSizeAvg = 0;
      for (i = 0; i < newSections.length; i++) {
        sectionSizeAvg += newSections[i].sizeEucl();
        if (smallestSection === null || newSections[smallestSection].sizeEucl() > newSections[i].sizeEucl()) {
          smallestSection = i;
        }
      }
      sectionSizeAvg /= newSections.length;
      if (newSections[smallestSection].sizeEucl() > sectionSizeAvg * 0.8) return null;

      if (smallestSection === 0) {
        newSections[smallestSection].concat(newSections[1]);
        newSections.splice(1, 1);
      } else if (smallestSection === newSections.length - 1) {
        newSections[newSections.length - 2].concat(newSections[newSections.length - 1]);
        newSections.splice(newSections.length - 1, 1);
      } else if (newSections[smallestSection - 1].sizeEucl() <= newSections[smallestSection + 1].sizeEucl()) {
        newSections[smallestSection - 1].concat(newSections[smallestSection]);
        newSections.splice(smallestSection, 1);
      } else {
        newSections[smallestSection].concat(newSections[smallestSection + 1]);
        newSections.splice(smallestSection + 1, 1);
      }
    }

    return newSections;
  };

  this.expandSections = function (sections, n) {
    var i;
    if (n <= sections.length) return sections;
    // if (n > sections.length + 1) return null;
    var newSections = [];
    for (i = 0; i < sections.length - 1; i++) newSections.push(sections[i]);

    // var smallestSection = null;
    // var sectionSizeAvg = 0;
    // for (i = 0; i < newSections.length; i++) {
    //   sectionSizeAvg += newSections[i].sizeEucl();
    //   if (smallestSection === null || newSections[smallestSection].sizeEucl() > newSections[i].sizeEucl()) {
    //     smallestSection = i;
    //   }
    // }
    //
    // if (newSections[smallestSection].sizeEucl() > sectionSizeAvg * 0.8) return null;

    for (i = sections.length; i <= n; i++) {
      newSections.push(sections[sections.length - 1].copy());
    }
    return newSections;
  };

  /* Calculate the match considering comparing the given sections to all the sections of the query.
   * Each query section is scaled to match each section of the argument, and its tangents are compared. */
  this.calculatePointsMatch = function (querySections, matchedSections, partialQuery) {
    var reduced = false, expanded = false;

    if (Parameters.CHECK_QUERY_COMPATIBILITY) {
      if (!this.areCompatibleSections(querySections, matchedSections, !partialQuery)) return null;
    } else {
      if (querySections.length > matchedSections.length) {
        matchedSections = this.expandSections(matchedSections, querySections.length);
        expanded = true;
      } else if (querySections.length < matchedSections.length) {
        matchedSections = this.reduceSections(matchedSections, querySections.length);
        reduced = true;
      }
      if (matchedSections == null) return null;
      if (!this.areCompatibleSections(querySections, matchedSections, !partialQuery)) return null;
    }

    var centroidsDifference;
    var i, si;

    // /* It does the average scale factor, uniformly scaling all the sections. */
    var matchedSecBounds = this.getBounds(matchedSections,
      (matchedSections.length > 2 ? 1 : 0),
      matchedSections.length - (matchedSections.length > 2 ? 2 : 1)
    );

    var queryBounds = this.getBounds(querySections,
      (querySections.length > 2 ? 1 : 0),
      querySections.length - (querySections.length > 2 ? 2 : 1)
    );

    var subSequenceScaleFactorX = (matchedSecBounds.maxX - matchedSecBounds.minX) / (queryBounds.maxX - queryBounds.minX);
    var subSequenceScaleFactorY = (matchedSecBounds.maxY - matchedSecBounds.minY) / (queryBounds.maxY - queryBounds.minY);

    var debugLines = [];
    var pointDifferencesCost = 0;
    var rescalingCost = 0;
    var res;
    var matchedPoints = [];
    var errors = [];

    /* Then it scales all the sections and do the differences (the scale will not be too far from the average scale factor)*/
    for (si = 0; si < querySections.length; si++) {
      var dataSect = {}, querySect = {};
      res = {sum: 0, num: 0};

      querySect.points = querySections[si].points;
      querySect.width = _.last(querySect.points).x - querySect.points[0].x;
      querySect.height = _.max(querySect.points, 'y').y - _.min(querySect.points, 'y').y;
      if (querySect.height === 0) continue;

      if (si === 0 && querySections.length > 2 && Parameters.START_END_CUT_IN_SUBPARTS) {
        dataSect.points = this.sectionEndSubpartPoints(matchedSections[si], querySect.width * subSequenceScaleFactorX);
      } else if (si === querySections.length - 1 && querySections.length > 2 && Parameters.START_END_CUT_IN_SUBPARTS_IN_RESULTS) {
        dataSect.points = this.sectionStartSubpartPoints(matchedSections[si], querySect.width * subSequenceScaleFactorX);
      } else {
        dataSect.points = matchedSections[si].points;
      }

      dataSect.width = _.last(dataSect.points).x - dataSect.points[0].x;
      dataSect.height = _.max(dataSect.points, 'y').y - _.min(dataSect.points, 'y').y;
      if (dataSect.height === 0) continue;

      // How much I need to scale the query to have the same size of the
      var scaleFactorX = dataSect.width / (querySect.width * subSequenceScaleFactorX);
      var scaleFactorY = dataSect.height / (querySect.height * (Parameters.RESCALING_Y ? subSequenceScaleFactorY : subSequenceScaleFactorX));

      if (scaleFactorX !== 0 && scaleFactorY !== 0)
        rescalingCost += Math.pow(Math.log(scaleFactorX), 2) + Math.pow(Math.log(scaleFactorY), 2);
      if (Parameters.DEBUG && !partialQuery) {
        errors.push({cx: Math.pow(Math.log(scaleFactorX), 2), cy: Math.pow(Math.log(scaleFactorY), 2)});
      }

      //calculate the centroid of the two sections to align them
      dataSect.centroidY = 0;
      for (i = 0; i < dataSect.points.length; i++) {
        dataSect.centroidY += dataSect.points[i].y;
      }
      dataSect.centroidY /= dataSect.points.length;
      querySect.centroidY = 0;
      for (i = 0; i < querySect.points.length; i++) {
        querySect.centroidY += querySect.points[i].y * (Parameters.RESCALING_Y ? subSequenceScaleFactorY : subSequenceScaleFactorX) * scaleFactorY;
      }
      querySect.centroidY /= querySect.points.length;
      centroidsDifference = querySect.centroidY - dataSect.centroidY;
      centroidsDifference = querySect.points[0].y * (Parameters.RESCALING_Y ? subSequenceScaleFactorY : subSequenceScaleFactorX) * scaleFactorY - dataSect.points[0].y;

      var queryPtsStep = querySect.points.length / dataSect.points.length;

      // The query is compared with all the other points sampling the query, so it is automatically resized
      for (i = 0; i < dataSect.points.length; i++) {
        var dataPt = dataSect.points[i];
        var queryPt = querySect.points[Math.floor(i * queryPtsStep)];
        if (Parameters.DEBUG && !partialQuery) {
          debugLines.push({
            x1: dataPt.x,
            y1: queryPt.y * (Parameters.RESCALING_Y ? subSequenceScaleFactorY : subSequenceScaleFactorX) * scaleFactorY - centroidsDifference,
            x2: dataPt.x,
            y2: dataPt.y
          });
        }

        // the difference is scaled in percentage of the height
        /* The difference is sqrt((x1 - x2)^2 + (y1 - y2)^2) where x1=x2, so it is the same of |y1-y2| */
        res.sum += math.abs((queryPt.y * (Parameters.RESCALING_Y ? subSequenceScaleFactorY : subSequenceScaleFactorX) * scaleFactorY - centroidsDifference) - dataPt.y) / dataSect.height;
        // res.sum += math.pow(
        //   ((queryPt.y * (Parameters.RESCALING_Y ? subSequenceScaleFactorY : subSequenceScaleFactorX) * scaleFactorY - centroidsDifference) - dataPt.y) /
        //   dataSect.height, 2);
        res.num++;
      }

      if (!partialQuery) {
        if (Parameters.START_END_CUT_IN_SUBPARTS_IN_RESULTS) {
          for (i = 0; i < dataSect.points.length; i++) matchedPoints.push(dataSect.points[i]);
        } else {
          for (i = 0; i < matchedSections[si].points.length; i++) matchedPoints.push(matchedSections[si].points[i]);
        }
      }

      // if (res.num > 0) pointDifferencesCost += math.sqrt(res.sum) / res.num;
      if (res.num > 0) pointDifferencesCost += res.sum / res.num;
    }

    // The result is defined as the average normalized difference between the curves
    return {
      match: pointDifferencesCost * Parameters.VALUE_DIFFERENCE_WEIGHT + rescalingCost * Parameters.RESCALING_COST_WEIGHT,
      matchedPoints: matchedPoints,
      debugLines: debugLines, // for debug
      errors: errors, // for debug
      reduced: reduced, // for debug
      expanded: expanded // for debug
    };
  };

  this.sectionStartSubpartPoints = function (section, width) {
    var startX = section.points[0].x, points = [];
    for (var pi = 0; pi < section.points.length; pi++) {
      points.push(section.points[pi]);
      if (section.points[pi].x - startX >= width) break;
    }
    return points;
  };

  this.sectionEndSubpartPoints = function (section, width) {
    var endX = _.last(section.points).x, points = [];
    for (var pi = section.points.length - 1; pi >= 0; pi--) {
      points.unshift(section.points[pi]);
      if (endX - section.points[pi].x >= width) break;
    }
    return points;
  };

  /**
   * Execute the query in DTW (deprecated)
   */
  // this.executeQueryDTWorED = function () {
  //   var startingTime = new Date();
  //   var matches = [];
  //   var j, i;
  //   var datasetSize = null;
  //
  //   for (var datasetIdx = 0; datasetIdx < DatasetAPI.getDatasetsNum(); datasetIdx++) {
  //     var smoothIterationsNum = DatasetAPI.getSmoothIterationsNum(datasetIdx);
  //     if (smoothIterationsNum === 0) throw 'No data to query'; // should be controlled by the UI
  //     for (var smoothi = 0; smoothi < smoothIterationsNum; smoothi++) {
  //
  //       var points = DatasetAPI.getData(datasetIdx, smoothi);
  //
  //       if (datasetSize === null) {
  //         datasetSize = _.last(points).x - points[0].x;
  //       }
  //       var dataTangents = this.extractTangents(points);
  //       var dataSections = this.findCurveSections(dataTangents, points, Parameters.DIVIDE_SECTION_MIN_HEIGHT_DATA);
  //
  //       if (this.sections.length > dataSections.length) continue;
  //
  //       for (i = 0; i < dataSections.length - this.sections.length + 1; i++) {
  //         var valid = false;
  //         var matchedSections = [];
  //         var debugSectionNumbers = '';
  //
  //         // calculating the scale factor agreement
  //         for (j = 0; j < this.sections.length; j++) {
  //           valid = true;
  //           matchedSections.push(dataSections[j + i]);
  //           debugSectionNumbers += (j + i) + ', ';
  //         }
  //         if (!valid) continue;
  //
  //         var cost = this.executeDTWorED(this.sections, matchedSections);
  //
  //         var matchedPoints = this.extractPointsFromSections(matchedSections);
  //         var minPos = matchedPoints[0].x;
  //         var maxPos = _.last(matchedPoints).x;
  //         var matchSize = (maxPos - minPos) / datasetSize;
  //         var matchTimeSpan = this.calculateMatchTimeSpan(matchedPoints[0], _.last(matchedPoints));
  //
  //         var newMatch = {
  //           snum: datasetIdx,
  //           smoothIteration: smoothi,
  //           match: cost,
  //           timespan: matchTimeSpan,
  //           size: matchSize,
  //           points: matchedPoints,
  //           minPos: minPos,
  //           maxPos: maxPos
  //         };
  //
  //         var duplicateMatchIdx = this.searchEqualMatch(newMatch, matches);
  //         if (duplicateMatchIdx === -1) {
  //           newMatch.id = matches.length; // new id for the new match
  //           matches.push(newMatch);
  //         } else if (matches[duplicateMatchIdx].match > newMatch.match) {
  //           newMatch.id = matches.length; // new id for the new match
  //           matches.push(newMatch);
  //           newMatch.id = matches[duplicateMatchIdx].id; // we leave the old id for the match
  //           matches[duplicateMatchIdx] = newMatch;
  //         }
  //
  //       }
  //
  //     }
  //   }
  //
  //   var finishingTime = new Date();
  //   Qetch.DEBUG_LAST_EXECUTING_TIME = finishingTime - startingTime;
  //
  //   return matches;
  // };

  /* Return the index of a match that starts and ends in the same positions of the targetMatch, 
   * returns -1 if nothing has been found. */
  this.searchEqualMatch = function (targetMatch, matches) {
    var targetStartX = targetMatch.points[0].x,
      targetEndX = _.last(targetMatch.points).x;
    for (var idx = 0; idx < matches.length; idx++) {
      if (Math.abs(targetStartX - matches[idx].points[0].x) <= 10 &&
        Math.abs(targetEndX - _.last(matches[idx].points).x) <= 10) {
        return idx;
      }
    }
    return -1;
  };

  /**
   * DTW for generic query length (deprecated)
   */
  // this.executeDTWorED = function (querySections, matchedSections) {
  //   var si, pi, querySection, dataSection, cy;
  //
  //   /* Compute the scale factor to perform an uniform scaling. */
  //   var minDataX = matchedSections[0].points[0].x;
  //   var maxDataX = _.last(_.last(matchedSections).points).x;
  //
  //   var minQueryX = querySections[0].points[0].x;
  //   var maxQueryX = _.last(_.last(querySections).points).x;
  //
  //   var scaleFactor = (maxQueryX - minQueryX) / (maxDataX - minDataX);
  //
  //   var minDataY = null, maxDataY = null;
  //   var minQueryY = null, maxQueryY = null;
  //
  //   var numQueryPoints = 0;
  //
  //   var dataAvgY = {sum: 0, num: 0};
  //   var queryAvgY = {sum: 0, num: 0};
  //   for (si = 0; si < querySections.length; si++) {
  //     querySection = querySections[si];
  //     for (pi = 0; pi < querySection.points.length; pi++) {
  //       numQueryPoints++;
  //       cy = querySection.points[pi].y;
  //       if (minQueryY === null || minQueryY > cy) minQueryY = cy;
  //       if (maxQueryY === null || maxQueryY < cy) maxQueryY = cy;
  //       queryAvgY.sum += cy;
  //       queryAvgY.num++;
  //     }
  //   }
  //
  //   for (si = 0; si < matchedSections.length; si++) {
  //     dataSection = matchedSections[si];
  //     for (pi = 0; pi < dataSection.points.length; pi++) {
  //       cy = dataSection.points[pi].y * scaleFactor;
  //       if (minDataY === null || minDataY > cy) minDataY = cy;
  //       if (maxDataY === null || maxDataY < cy) maxDataY = cy;
  //       dataAvgY.sum += cy;
  //       dataAvgY.num++;
  //     }
  //   }
  //   dataAvgY = dataAvgY.sum / dataAvgY.num;
  //   queryAvgY = queryAvgY.sum / queryAvgY.num;
  //   var translation = dataAvgY - queryAvgY;
  //   var step;
  //
  //   var d1 = [], d2 = [];
  //   for (si = 0; si < matchedSections.length; si++) {
  //     querySection = querySections[si];
  //     dataSection = matchedSections[si];
  //     step = querySection.points.length / dataSection.points.length;
  //     for (pi = 0; pi < querySection.points.length; pi += step) {
  //       d1.push(querySection.points[Math.floor(pi)].y);
  //     }
  //     for (pi = 0; pi < dataSection.points.length; pi++) {
  //       d2.push(dataSection.points[pi].y * scaleFactor - translation);
  //     }
  //   }
  //
  //   // Re-interpolate
  //   // since [1,3,5] and [1,2,3,4,5] express the same trend with different aspect ratio
  //   // we normalize the two sequences to have almost the same length. In this way we prevent
  //   // the problems that DTW has with those different sequences
  //   var diff = d2.length / d1.length;
  //   var newD = [];
  //   for (pi = 0; pi < d2.length; pi += diff) {
  //     newD.push(d2[Math.floor(pi)]);
  //   }
  //   d2 = newD;
  //
  //   var currSectsHeight = maxDataY - minDataY;
  //   var currQSectsHeight = maxQueryY - minQueryY;
  //   var cmpHeight = Math.max(currSectsHeight, currQSectsHeight);
  //
  //   var cost;
  //   if (Parameters.ALGORITHM_TO_USE == 'dtw') {
  //     var dtw = new DTW({
  //       distanceFunction: function (x1, x2) {
  //         return Math.abs((x1 - x2) / cmpHeight);
  //       }
  //     });
  //     cost = dtw.compute(d1, d2);
  //   } else {
  //     cost = this.euclideanDistance(d1, d2, cmpHeight);
  //   }
  //
  //   return cost;
  // };

  /**
   * Calculate the euclidean distance between the two sequences
   * Since the x values of series1 and series2 are the same (they should be two time series with the same
   * number of elements) the euclidean distance formula can be semplified in an absolute difference.
   *
   * relativeheight is used only by euclidean distance (with Qetch section partitioning)
   */
  this.euclideanDistance = function (series1, series2, relativeHeight) {
    if (relativeHeight === undefined) relativeHeight = 1;
    var res = 0;
    for (var i = 0; i < series1.length; i++) {
      res += Math.pow((series1[i] - series2[i]) / relativeHeight, 2);
    }
    return Math.sqrt(res);
  };

  /**
   * Execute the query in DTW or ED (query length version)
   */
  this.executeQueryVDTWorVED = function () {
    var startingTime = new Date();

    var matches = [];
    var j, i, pi;
    var queryValues = [];

    for (var datasetIdx = 0; datasetIdx < DatasetAPI.getDatasetsNum(); datasetIdx++) {
      var dataPoints = DatasetAPI.getData(datasetIdx, 0); // only smooth 0, DTW can deal with noises

      var dataStep = (_.last(dataPoints).origX - dataPoints[0].origX) / dataPoints.length;

      var queryLength = Math.ceil(this.queryLength / dataStep);

      // query sampling to adapt it to be the same size of the dataset (re-interpolate)
      var groupSize = Math.ceil(this.points.length / queryLength);
      var acc = 0, accc = 0;
      for (i = 0; i < this.points.length; i++) {
        acc += this.points[i].y;
        accc++;
        if ((i + 1) % groupSize === 0) {
          queryValues.push(acc / accc);
          acc = accc = 0;
        }
      }

      // normalize query values
      // if (Parameters.ALGORITHM_TO_USE == 'dtw') {
      //   var stdQ = math.std(queryValues), meanQ = math.mean(queryValues);
      //   for (pi = 0; pi < queryValues.length; pi++) {
      //     queryValues[pi] = (queryValues[pi] - meanQ) / stdQ;
      //   }
      // }

      // calculate the query y average
      var queryAvgY = math.mean(queryValues);

      // calculate the width of the dataset of a subsequence with that query size
      var queryWidth = _.last(this.points).x - this.points[0].x;
      var queryHeight = _.max(this.points, 'y').y - _.min(this.points, 'y').y;
      var slidingWindowStep = Math.ceil(queryLength / 100) * Parameters.QUERYLENGTH_SLIDING_WINDOW_STEP;

      // Sliding window through the data to find matches
      for (i = 0; i < dataPoints.length - queryLength - 1; i += slidingWindowStep) {
        var subSequencePoints = [];
        var subSequenceValues = [];
        for (j = 0; j < queryLength; j++) {
          subSequencePoints.push(dataPoints[i + j]);
          subSequenceValues.push(dataPoints[i + j].y);
        }

        var datasetQuerySizeWidth = subSequencePoints[subSequencePoints.length - 1].x - subSequencePoints[0].x;
        var datasetQuerySizeHeight = _.max(subSequenceValues) - _.min(subSequenceValues);
        var scaleFactorX = queryWidth / datasetQuerySizeWidth;
        var scaleFactorY = queryHeight / datasetQuerySizeHeight;

        for (j = 0; j < subSequenceValues.length; j++) {
          subSequenceValues[j] *= Parameters.RESCALING_Y ? scaleFactorY : scaleFactorX;
        }

        // normalize sub sequence values
        // if (Parameters.ALGORITHM_TO_USE == 'dtw') {
        //   var stdD = math.std(subSequenceValues), meanD = math.mean(subSequenceValues);
        //   for (pi = 0; pi < subSequenceValues.length; pi++) {
        //     subSequenceValues[pi] = (subSequenceValues[pi] - meanD) / stdD;
        //   }
        // }

        // calculate the center point of the dataset subsection (those are rescaled points, so we don't need to multiply
        // datasetAvgY by the scale factor)
        var datasetAvgY = math.mean(subSequenceValues);

        // offset translation (move the subsection of the dataset to have the same height of the query)
        var datasetQueryDifference = queryAvgY - datasetAvgY;
        for (j = 0; j < subSequenceValues.length; j++) subSequenceValues[j] += datasetQueryDifference;

        var cost;
        if (Parameters.ALGORITHM_TO_USE == 'dtw') {
          cost = new DTW().compute(queryValues, subSequenceValues);
        } else {
          cost = this.euclideanDistance(queryValues, subSequenceValues, queryHeight);
        }

        var matchTimeSpan = this.calculateMatchTimeSpan(subSequencePoints[0], _.last(subSequencePoints));
        var minPos = subSequencePoints[0].x;
        var maxPos = _.last(subSequencePoints).x;

        var newMatch = {
          snum: datasetIdx,
          id: matches.length,
          smoothIteration: 0,
          match: cost,
          timespan: matchTimeSpan,
          size: this.queryLength,
          points: subSequencePoints,
          minPos: minPos,
          maxPos: maxPos
        };
        matches.push(newMatch);
      }
    }

    var finishingTime = new Date();
    Qetch.DEBUG_LAST_EXECUTING_TIME = finishingTime - startingTime;

    return matches;
  };

  /* Used by 1NN */
  this.calculateDTWorED = function (queryPoints, dataPoints, alg) {
    var datasetPtsStep = dataPoints.length / queryPoints.length;

    var datasetValues = [];
    for (var i = 0; i < queryPoints.length; i++) {
      var dataPt = dataPoints[Math.floor(i * datasetPtsStep)];
      datasetValues.push(dataPt.y);
    }

    // // dataset sampling to adapt it to be the same size of the query
    // var datasetValues = [];
    // var groupSize = Math.ceil(dataPoints.length / queryLength);
    // var i, acc = 0, accc = 0;
    // for (i = 0; i < dataPoints.length; i++) {
    //   acc += dataPoints[i].y;
    //   accc++;
    //   if ((i + 1) % groupSize === 0) {
    //     datasetValues.push(acc / accc);
    //     acc = accc = 0;
    //   }
    // }

    var queryValues = [];
    for (i = 0; i < queryPoints.length; i++) queryValues.push(queryPoints[i].y);

    // calculate the width of the dataset of a subsequence with that query size
    var queryWidth = _.last(queryPoints).x - queryPoints[0].x;
    var queryHeight = _.max(queryPoints, 'y').y - _.min(queryPoints, 'y').y;

    // calculate the dataset y average
    var queryAvgY = 0;
    for (i = 0; i < queryPoints.length; i++) queryAvgY += queryValues[i];
    queryAvgY /= queryPoints.length;

    // calculate the width of the dataset of a subsequence with that query size
    var dsWidth = _.last(dataPoints).x - dataPoints[0].x;
    var dsHeight = _.max(dataPoints, 'y').y - _.min(dataPoints, 'y').y;

    var scaleFactorY = queryHeight / dsHeight;

    for (var j = 0; j < datasetValues.length; j++) {
      datasetValues[j] *= scaleFactorY;
    }

    // calculate the center point of the dataset subection (those are rescaled points, so we don't need to multiply
    // datasetAvgY by the scale factor)
    var datasetAvgY = 0;
    for (j = 0; j < datasetValues.length; j++) datasetAvgY += datasetValues[j];
    datasetAvgY /= datasetValues.length;

    // move the subsection of the dataset to have the same amplitude of the query
    var datasetQueryDifference = queryAvgY - datasetAvgY;
    for (j = 0; j < datasetValues.length; j++) datasetValues[j] += datasetQueryDifference;

    var cost;
    if (alg == 'dtw') {
      cost = new DTW().compute(queryValues, datasetValues);
    } else {
      cost = this.euclideanDistance(queryValues, datasetValues);
    }

    return {match: cost};
  };

  this.checkQueryLength = function (queryLength) {
    if (this.queryLength === null) return true;
    var min = this.queryLength - this.queryLength * this.queryLengthTolerance;
    var max = this.queryLength + this.queryLength * this.queryLengthTolerance;
    // console.log('query length: ', queryLength, ' min: ', min, ' max: ', max, ' result: ', queryLength >= min && queryLength <= max);
    return queryLength >= min && queryLength <= max;
  };

  this.checkQueryHeight = function (queryHeight) {
    if (this.queryHeight === null) return true;
    var min = this.queryHeight - this.queryHeight * this.queryHeightTolerance;
    var max = this.queryHeight + this.queryHeight * this.queryHeightTolerance;
    console.log('query height: ', queryHeight, ' min: ', min, ' max: ', max, ' result: ', queryHeight >= min && queryHeight <= max);
    return queryHeight >= min && queryHeight <= max;
  };

  this.extractPointsFromSections = function (sections) {
    var points = [];
    _.forEach(sections, function (section) {
      _.forEach(section.points, function (p) {
        points.push(p.copy());
      });
    });
    return points;
  };

  this.tangent = function (p1, p2) {
    return (p2.y - p1.y) / (p2.x - p1.x);
  };

  /**
   * Extract the tangents of a set of points
   * @return *[] array of tangents:
   * the first tangent is related to the first and second point
   * the second is related to the second and the first
   * the third is related to the third and the second
   * ...
   */
  this.extractTangents = function (points) {
    if (points.length < 2) return [];
    var tangents = [this.tangent(points[0], points[1])];
    for (var i = 1; i < points.length; i++) {
      tangents.push(this.tangent(points[i - 1], points[i]));
    }
    return tangents;
  };

  /**
   * Given a list of tangents it divides the list of tangents in a list of sections.
   * Each section shares the same tangent signs (a section could be an increasing curve
   * or a decreasing curve, but not both)
   *
   * @return Array of sections.
   */
  this.findCurveSections = function (tangents, points, minHeightPerc) {
    var i, sign, sections = [], lastTg = null, lastPt = null;
    var totalHeight = _.max(points, 'y').y - _.min(points, 'y').y;
    var lastSect = null, lastSectHeight = 0;

    for (i = 0; i < tangents.length; i++) {
      var tangent = tangents[i], pt = points[i];
      sign = Math.sign(tangent);

      if (sections.length === 0) {
        sections.push(new Qetch.Section(sign));
      } else if (sign !== 0) {
        lastSect = _.last(sections);
        if (lastSect.sign != sign) {
          lastSectHeight = _.max(lastSect.points, 'y').y - _.min(lastSect.points, 'y').y;
          if (lastSect.points.length > 1 && (minHeightPerc > 0 ? lastSectHeight / totalHeight > minHeightPerc : true)) {
            var newSection = new Qetch.Section(sign);
            sections.push(newSection);
            newSection.points.push(lastPt);
            newSection.tangents.push(lastTg);  
          }
        }
      }

      lastSect = _.last(sections);
      lastSect.points.push(pt);
      lastSect.tangents.push(tangent);
      lastTg = tangent;
      lastPt = pt;
    }

    var count = 0;
    var prev = null;
    _.forEach(sections, function (s) {
      s.id = count++;
      if (prev !== null) prev.next.push({dest: s});
      prev = s;
    });
    prev.next = [];

    return sections;
  };

  /* do a selection for regular expression. This function will analyze the current query
   to include the enclosed sections and will return a rect {x1: -, x2: -, y1: -, y2: -}
   with the same format of the one given in input.
   */
  this.regexpOpSel = function (selRect, op) {
    var res = {x1: undefined, x2: undefined, y1: undefined, y2: undefined};
    var i, j, si, p;

    var startSelectedSectionIdx = null, endSelectedSectionIdx = null;
    for (i = 0; i < this.sections.length; i++) {
      var section = this.sections[i];
      for (j = 0; j < section.points.length; j++) {
        p = section.points[j];
        if (p.x >= selRect.x1 && p.x <= selRect.x2 && p.y <= selRect.y1 && p.y >= selRect.y2) {
          if (startSelectedSectionIdx === null) startSelectedSectionIdx = i;
          endSelectedSectionIdx = i;
          break;
        }
      }
    }
    if (startSelectedSectionIdx === null || endSelectedSectionIdx === null) return null;

    if (this.sections[startSelectedSectionIdx].sign == this.sections[endSelectedSectionIdx].sign) {
      endSelectedSectionIdx--;
    }
    if (endSelectedSectionIdx - startSelectedSectionIdx <= 0) return null;

    if (op.op === '+') {

      // checks loops 
      for (i = startSelectedSectionIdx; i <= endSelectedSectionIdx; i++) {
        if (this.sections[i].next.length > 1) {
          console.log('loop found, canceling current selection');
          return null;
        }
        for (si = endSelectedSectionIdx; si < this.sections.length; si++) {
          for (j = 0; j < this.sections[si].next.length; j++) {
            if (this.sections[si].next[j].dest.id == this.sections[i].id) {
              console.log('loop found, canceling current selection');
              return null;
            }
          }
        }
      }

      this.sections[endSelectedSectionIdx].next.push({
        dest: this.sections[startSelectedSectionIdx],
        size: op.size
      });
    } else {
      // ...
    }

    for (i = startSelectedSectionIdx; i <= endSelectedSectionIdx; i++) {
      var sectionPts = this.sections[i].points;
      for (j = 0; j < sectionPts.length; j++) {
        p = sectionPts[j];
        if (res.x1 === undefined || res.x1 > p.x) res.x1 = p.x - 3; // + a constant
        if (res.x2 === undefined || res.x2 < p.x) res.x2 = p.x + 6; // to have a padding
        if (res.y1 === undefined || res.y1 > p.y) res.y1 = p.y - 3;
        if (res.y2 === undefined || res.y2 < p.y) res.y2 = p.y + 6;
      }
    }

    return res;
  };
  this.setNotOperator = function (value) {
    this.notOperator = value;
  };
  this.resetRegexpOps = function () {
    this.notOperator = -1;
    var prev = null;
    _.forEach(this.sections, function (s) {
      if (prev !== null) prev.next = [{dest: s}];
      prev = s;
    });
    if (prev !== null) prev.next = [];
  };

  this.calculateMatchTimeSpan = function (startPoint, endPoint) {
    var matchTimeSpan = {
      value: endPoint.origX - startPoint.origX
    };

    if (matchTimeSpan.value < 1000) {
      matchTimeSpan.str = Math.round(matchTimeSpan.value) + ' ms';
    } else if (matchTimeSpan.value < (1000 * 60)) {
      matchTimeSpan.str = (matchTimeSpan.value / 1000).toFixed(3) + ' s';
    } else if (matchTimeSpan.value < (1000 * 3600)) {
      matchTimeSpan.str = (matchTimeSpan.value / (1000 * 60)).toFixed(3) + ' min';
    } else if (matchTimeSpan.value < (1000 * 3600 * 24)) {
      matchTimeSpan.str = Math.round(matchTimeSpan.value / (1000 * 3600)) + ' hrs';
    } else if (matchTimeSpan.value < (1000 * 3600 * 24 * 365)) {
      matchTimeSpan.str = Math.round(matchTimeSpan.value / (1000 * 3600 * 24)) + ' days';
    } else {
      matchTimeSpan.str = parseFloat(Math.round((matchTimeSpan.value / (1000 * 3600 * 24 * 365)) * 100) / 100).toFixed(1) + ' years';
    }

    return matchTimeSpan;
  };

  this.calculateMatchHeight = function (matchedPts) {
    var minY = _.min(matchedPts, 'y').origY;
    var maxY = _.max(matchedPts, 'y').origY;
    return maxY - minY;
  };

  document.getNumberOfSections = function (snum, smoothi) {
    var dataPoints = DatasetAPI.getData(snum, smoothi);
    var dataTangents = self.extractTangents(dataPoints);
    var dataSections = self.findCurveSections(dataTangents, dataPoints, Parameters.DIVIDE_SECTION_MIN_HEIGHT_DATA);
    return dataSections.length;
  };


}]);