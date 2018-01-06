var QetchQuery = angular.module('QetchQuery');

QetchQuery.directive('queryCanvas', ['QetchQuery_QueryAPI', 'QetchQuery_DrawRefining', 'DatasetAPI', 'Data_Utils', 'Parameters',
  function (QetchQuery_QueryAPI, QetchQuery_DrawRefining, DatasetAPI, Data_Utils, Parameters) {
    return {
        restrict: 'E',
        replace: true,
        template: '<canvas></canvas>',
        scope: true,
        controller: ['$scope', function (scope) {
          scope.currentPath = null;
          scope.segment = null;
          scope.handle = null;
          scope.hitOptions = {
            segments: true,
            stroke: true,
            handles: true,
            tolerance: 5
          };
          scope.size = { width: 0, height: 0};

          scope.shapes = [];
          scope.notOpShape = null;
          scope.regexpOp = null;

          scope.currentQuery = {
            points: undefined,
            originX: undefined,
            originY: undefined
          };

          scope.queryLength = {value: null, str: null};

          scope.$on(Parameters.QUERY_REFINEMENT_EVENTS.SET_QUERY_LENGTH, function (event, queryLength, queryLengthStr) {
            scope.queryLength = {value: queryLength, str: queryLengthStr};
            scope.updateQueryLengthInfo();
          });

          scope.queryHeight = {value: null, str: null};

          scope.$on(Parameters.QUERY_REFINEMENT_EVENTS.SET_QUERY_HEIGHT, function (event, queryHeight, queryHeightStr) {
            scope.queryHeight = {value: queryHeight, str: queryHeightStr};
            scope.updateQueryHeightInfo();
          });

          scope.$on(Parameters.QUERYPAPER_EVENTS.ADD_REGEXP_OP, function (event, op) {
            scope.regexpOp = op;
            if (scope.regexpOp.op === '!') scope.updateNotOperatorInfo(scope.regexpOp.val);
          });

          scope.$on(Parameters.QUERY_EVENTS.CLEAR, function (event, matches, matchIndex) {
            console.log('query clear');
            paper.project.clear();
            paper.view.draw();
            scope.currentPath = null;

            scope.resetCurrentShape();
            scope.resetShapes();
            scope.currentQuery = {};

            scope.size.width = paper.view.size.width;
            scope.size.height = paper.view.size.height;
            scope.drawSquaredPaperLines();
          });

          scope.updateNotOperatorInfo = function (val) {
            this.resetNotShape();

            var cpBounds = scope.getCurrentPathBounds();
            if (cpBounds !== null && scope.regexpOp && scope.regexpOp.value !== null) {
              var margin = 10;
              var queryLengthMargin = scope.queryLengthInfo ? 20 : 0;
              var size = new paper.Size(cpBounds.maxX - cpBounds.minX + 2 * margin, cpBounds.maxY - cpBounds.minY + 2 * margin + queryLengthMargin);
              var pos = new paper.Point(cpBounds.minX - margin, cpBounds.minY - margin);

              scope.notOpShape = {shape: new paper.Shape.Rectangle(pos, size), decorations: {}};
              scope.notOpShape.shape.strokeColor = Parameters.PATH_STROKECOLOR;
              scope.notOpShape.shape.strokeColor = 'gray';
              scope.notOpShape.shape.strokeColor = '#d9534f';

              scope.notOpShape.decorations.labelBg = new paper.Path([
                new paper.Point(cpBounds.maxX + margin, cpBounds.minY - margin),
                new paper.Point(cpBounds.maxX + margin, cpBounds.minY + 22 - margin),
                new paper.Point(cpBounds.maxX - 22 + margin, cpBounds.minY - margin)
              ]);
              scope.notOpShape.decorations.labelBg.closed = true;
              scope.notOpShape.decorations.labelBg.fillColor = '#d9534f';

              scope.notOpShape.decorations.label = new paper.PointText(
                new paper.Point(cpBounds.maxX - 6 + margin, cpBounds.minY + 11 - margin)
              );
              scope.notOpShape.decorations.label.justification = 'center';
              scope.notOpShape.decorations.label.fillColor = 'white';
              scope.notOpShape.decorations.label.fontSize = '12px';
              scope.notOpShape.decorations.label.fontFamily = 'Courier';
              scope.notOpShape.decorations.label.content = '!';

              QetchQuery_QueryAPI.setNotOperator(val);
              scope.regexpOp = null;
              paper.view.draw();
              QetchQuery_QueryAPI.setPoints(scope.extractPoints());
            }
          };

          scope.updateQueryLengthInfo = function () {
            if (scope.queryLengthInfo) scope.queryLengthInfo.remove();
            if (!scope.currentPath) return;

            var cpBounds = scope.getCurrentPathBounds();
            if (cpBounds !== null && scope.queryLength.value !== null) {

              var lineY = cpBounds.maxY + 20;
              var lineStartX = cpBounds.minX;
              var lineEndX = cpBounds.maxX;

              var seg0 = new paper.Path();
              seg0.strokeColor = Parameters.PATH_STROKECOLOR;
              seg0.strokeWidth = 1;
              seg0.strokeJoin = 'round';
              seg0.moveTo(new paper.Point(lineStartX, lineY - 5));
              seg0.add(new paper.Point(lineStartX, lineY + 5));

              var seg1 = new paper.Path();
              seg1.strokeColor = Parameters.PATH_STROKECOLOR;
              seg1.strokeWidth = 1;
              seg1.strokeJoin = 'round';
              seg1.moveTo(new paper.Point(lineStartX, lineY));
              seg1.add(new paper.Point(lineEndX, lineY));

              var seg2 = new paper.Path();
              seg2.strokeColor = Parameters.PATH_STROKECOLOR;
              seg2.strokeWidth = 1;
              seg2.strokeJoin = 'round';
              seg2.moveTo(new paper.Point(lineEndX, lineY - 5));
              seg2.add(new paper.Point(lineEndX, lineY + 5));

              var text = new paper.PointText(new paper.Point((lineStartX + lineEndX) / 2, lineY - 5));
              text.content = scope.queryLength.str;
              text.style = {
                fontSize: 10,
                fillColor: Parameters.PATH_STROKECOLOR,
                justification: 'center'
              };

              scope.queryLengthInfo = new paper.Group([seg0, seg1, seg2, text]);

              paper.view.draw();
              QetchQuery_QueryAPI.setPoints(scope.extractPoints());
            }
          };

          scope.updateQueryHeightInfo = function () {
            if (scope.queryHeightInfo) scope.queryHeightInfo.remove();
            if (!scope.currentPath) return;

            var cpBounds = scope.getCurrentPathBounds();
            if (cpBounds !== null && scope.queryHeight.value !== null) {

              var lineX = cpBounds.minX - 20;
              var lineStartY = cpBounds.minY;
              var lineEndY = cpBounds.maxY;

              var seg0 = new paper.Path();
              seg0.strokeColor = Parameters.PATH_STROKECOLOR;
              seg0.strokeWidth = 1;
              seg0.strokeJoin = 'round';
              seg0.moveTo(new paper.Point(lineX - 5, lineStartY));
              seg0.add(new paper.Point(lineX + 5, lineStartY));

              var seg1 = new paper.Path();
              seg1.strokeColor = Parameters.PATH_STROKECOLOR;
              seg1.strokeWidth = 1;
              seg1.strokeJoin = 'round';
              seg1.moveTo(new paper.Point(lineX, lineStartY));
              seg1.add(new paper.Point(lineX, lineEndY));

              var seg2 = new paper.Path();
              seg2.strokeColor = Parameters.PATH_STROKECOLOR;
              seg2.strokeWidth = 1;
              seg2.strokeJoin = 'round';
              seg2.moveTo(new paper.Point(lineX - 5, lineEndY));
              seg2.add(new paper.Point(lineX + 5, lineEndY));

              var text = new paper.PointText(new paper.Point(lineX - 5, (lineStartY + lineEndY) / 2));
              text.content = scope.queryHeight.str;
              text.matrix.rotate(0,0,90);
              text.style = {
                fontSize: 10,
                fillColor: Parameters.PATH_STROKECOLOR,
                justification: 'center'
              };

              scope.queryHeightInfo = new paper.Group([seg0, seg1, seg2, text]);

              paper.view.draw();
              QetchQuery_QueryAPI.setPoints(scope.extractPoints());
            }
          };

          // checks if the given point is compatible with the history of the current path
          scope.checkPointCompatibile = function(point) {
            var currentSegments = scope.currentPath.segments;
            if (currentSegments.length === 0) return true;
            return point.x >= _.last(currentSegments).point.x;
          };

          scope.getCurrentPathBounds = function () {
            if (scope.currentPath === null) return null;
            var bounds = {
              minX: Number.MAX_SAFE_INTEGER,
              maxX: Number.MIN_SAFE_INTEGER,
              minY: Number.MAX_SAFE_INTEGER,
              maxY: Number.MIN_SAFE_INTEGER
            };
            for (var i = 0; i < scope.currentPath.length; i += 0.1) {
              var p = scope.currentPath.getPointAt(i);
              if (p.x < bounds.minX) bounds.minX = p.x;
              if (p.x > bounds.maxX) bounds.maxX = p.x;
              if (p.y < bounds.minY) bounds.minY = p.y;
              if (p.y > bounds.maxY) bounds.maxY = p.y;
            }
            return bounds;
          };

          scope.drawOnPaper = function (ptsLst, centerWithCurrentPath, notInvert, noSmooth) {
            var cpBounds;

            if (Parameters.ALGORITHM_TO_USE == 'qetch' && !noSmooth) {
              //smoothing curve, only qetch needs a sigtly smooth for sketches coming from mturk,
              //since that version doesn't implement the same smooth as this interface.
              //Only for Qetch, we don't want to influence results of DTW or ED, they don't use sectionPoints
              Data_Utils.smooth(ptsLst, 2, 4);
            }

            if (!scope.currentPath) {
              centerWithCurrentPath = false;
            } else {
              cpBounds = scope.getCurrentPathBounds();
            }

            paper.project.clear();
            scope.drawSquaredPaperLines();

            if (ptsLst.length === 0) return;

            scope.currentPath = new paper.Path();
            scope.currentPath.strokeColor = Parameters.PATH_STROKECOLOR;
            scope.currentPath.strokeWidth = Parameters.PATH_STROKEWIDTH;
            scope.currentPath.strokeCap = 'round';
            scope.currentPath.strokeJoin = 'round';

            var minX = _.min(ptsLst, 'x').x, maxX = _.max(ptsLst, 'x').x;
            var minY = _.min(ptsLst, 'y').y, maxY = _.max(ptsLst, 'y').y;
            if (minY < 0) {
              maxY = maxY - minY;
              minY = 0;
            }

            var offsetX = Parameters.QUERY_AUTO_DRAW_PADDING, offsetY = Parameters.QUERY_AUTO_DRAW_PADDING;
            var sf = 1;
            if (centerWithCurrentPath) {
              var cpW = cpBounds.maxX - cpBounds.minX, ppW = maxX - minX,
                  cpH = cpBounds.maxY - cpBounds.minY, ppH = maxY - minY;
              sf = cpW / ppW;
              if (cpH * sf > ppH) sf = cpH / ppH;
              offsetX = cpBounds.minX + cpW / 2 - (ppW * sf) / 2;
              offsetY = cpBounds.minY + cpH / 2 - (ppH * sf) / 2;
              if (offsetX < 0) offsetX = Parameters.QUERY_AUTO_DRAW_PADDING;
              if (offsetY < 0) offsetY = Parameters.QUERY_AUTO_DRAW_PADDING;
            }

            for (var i = 0; i < ptsLst.length; i++) {
              var y = notInvert ? ptsLst[i].y : (maxY - minY) - ptsLst[i].y;
              scope.currentPath.add(new paper.Point(ptsLst[i].x * sf + offsetX, y * sf + offsetY));
            }
            scope.currentPath.smooth({type:'catmull-rom'});
            scope.currentPath.simplify();
            scope.currentPath.fullySelected = true;

            paper.view.draw();

            scope.updateQueryLengthInfo();
            scope.updateQueryHeightInfo();
            scope.updateNotOperatorInfo();

            QetchQuery_QueryAPI.setPoints(scope.extractPoints());

            scope.drawSections();
          };
          scope.$on(Parameters.QUERY_EVENTS.DRAW, function (event, ptsLst, centerWithCurrentPath, noSmooth) {
            scope.drawOnPaper(ptsLst, centerWithCurrentPath, false, noSmooth);
          });

          scope.drawPreviewOnPaper = function (ptsLst, centerWithCurrentPath) {
            var cpBounds;
            if (!scope.currentPath) {
              centerWithCurrentPath = false;
            } else {
              cpBounds = scope.getCurrentPathBounds();
            }

            var i;
            if (ptsLst.length === 0) return;

            scope.cleanPreview();

            scope.currentPreviewPath = new paper.Path();
            scope.currentPreviewPath.strokeColor = Parameters.PREVIEW_PATH_STROKECOLOR;
            scope.currentPreviewPath.strokeWidth = Parameters.PATH_STROKEWIDTH;
            scope.currentPreviewPath.dashArray = [10, 5];
            scope.currentPreviewPath.strokeJoin = 'round';

            var minX = _.min(ptsLst, 'x').x, maxX = _.max(ptsLst, 'x').x;
            var minY = _.min(ptsLst, 'y').y, maxY = _.max(ptsLst, 'y').y;
            var height = Math.abs(Math.max(minY, maxY) - Math.min(minY, maxY));

            var offsetX = Parameters.QUERY_AUTO_DRAW_PADDING, offsetY = Parameters.QUERY_AUTO_DRAW_PADDING;
            var sf = 1;

            if (centerWithCurrentPath) {
              var cpW = cpBounds.maxX - cpBounds.minX, ppW = maxX - minX,
                  cpH = cpBounds.maxY - cpBounds.minY, ppH = height;
              sf = cpW / ppW;
              if (cpH * sf > ppH) sf = cpH / ppH;
              offsetX = cpBounds.minX + cpW / 2 - (ppW * sf) / 2;
              offsetY = cpBounds.minY + cpH / 2 - (ppH * sf) / 2;
            }

            for (i = 0; i < ptsLst.length; i++) {
              scope.currentPreviewPath.add(new paper.Point(ptsLst[i].x * sf + offsetX,
                ((height) - (ptsLst[i].y - minY)) * sf + offsetY));
            }

            scope.currentPreviewPath.smooth({type:'catmull-rom'});
            scope.currentPreviewPath.simplify();
            scope.currentPreviewPath.fullySelected = true;

            paper.view.draw();
          };
          scope.$on(Parameters.QUERY_EVENTS.DRAW_PREVIEW, function (event, ptsLst, drawPreviewOnPaper) {
            scope.drawPreviewOnPaper(ptsLst, drawPreviewOnPaper);
          });
          scope.cleanPreview = function () {
            if (scope.currentPreviewPath) scope.currentPreviewPath.remove();
          };
          scope.$on(Parameters.QUERY_EVENTS.CLEAN_DRAW_PREVIEW, function (event, ptsLst) {
            scope.cleanPreview();
          });

          scope.onKeyUp = function(event) {
            if(event.character == "P") {
              var url = "data:image/svg+xml;utf8," + encodeURIComponent(paper.project.exportSVG({asString: true}));
              var link = document.createElement("a");
              link.download = "query.svg";
              link.href = url;
              link.click();
            } else if (event.character > '0' && event.character <= '5') {
              document.changeSmooth(parseInt(event.character));
            } else if (event.character == 'a') {
              document.showAllMatches();
            }
          };

          scope.onMouseDown = function(event) {
            scope.handle = null;
            scope.segment = null;
            scope.selectionStart = null;

            //Edit mode
            if (!QetchQuery_QueryAPI.isEmpty()) {
              var hitResult = scope.currentPath.hitTest(event.point, scope.hitOptions);
              if (hitResult) {
                if (hitResult.type == 'segment') {
                  
                  if (event.event.altKey) {
                    // remove the point
                    hitResult.segment.remove();
                  } else {
                    // start the move for the current segment
                    scope.segment = hitResult.segment;
                  }

                } else if (hitResult.type == 'stroke' && event.event.shiftKey) {

                  // Add a new point with the correct handles 
                  var location = hitResult.location;
                  var values = location.curve.getValues();
                  var parts = paper.Curve.subdivide(values, location.parameter);
                  var left = parts[0], right = parts[1];
                  var x = left[6], y = left[7];
                  var segment = new paper.Segment(new paper.Point(x, y),
                    new paper.Point(left[4] - x, left[5] - y),
                    new paper.Point(right[2] - x, right[3] - y));
                  scope.segment = hitResult.item.insert(location.index + 1, segment);
                  scope.segment.previous.handleOut.set(left[2] - left[0], left[3] - left[1]);
                  scope.segment.next.handleIn.set(right[4] - right[6], right[5] - right[7]);
                  scope.currentPath.fullySelected = true;

                } else if (hitResult.type == 'handle-in') {
                  // start the move for the current handle
                  scope.handle = hitResult.segment.handleIn;
                } else if (hitResult.type == 'handle-out') {
                  // start the move for the current handle
                  scope.handle = hitResult.segment.handleOut;
                }
              } else if (scope.regexpOp && scope.regexpOp.draw) {
                scope.resetCurrentShape();
                scope.selectionStart = event.point;
              }

              return;
            }

            scope.currentPath = new paper.Path();
            scope.currentPath.strokeColor = Parameters.PATH_STROKECOLOR;
            scope.currentPath.strokeWidth = Parameters.PATH_STROKEWIDTH;
            scope.currentPath.strokeCap = 'round';
            scope.currentPath.strokeJoin = 'round';
          };

          scope.onMouseDrag = function(event) {

            //Edit mode
            if (!QetchQuery_QueryAPI.isEmpty()) {
              if (scope.segment) {
                scope.segment.point.x += event.delta.x;
                scope.segment.point.y += event.delta.y;
                if (!scope.verifyPoints()) {
                  scope.segment.point.x -= event.delta.x;
                  scope.segment.point.y -= event.delta.y;
                }
                scope.resetShapes();
                scope.selectionStart = null;
              } else if (scope.handle) {
                scope.handle.x += event.delta.x;
                scope.handle.y += event.delta.y;
                if (!scope.verifyPoints()) {
                  scope.handle.x -= event.delta.x;
                  scope.handle.y -= event.delta.y;
                }
                scope.resetShapes();
                scope.selectionStart = null;
              } else if (scope.selectionStart) {
                if (event.point.x - scope.selectionStart.x > 0 && event.point.y - scope.selectionStart.y > 0) {
                  var size = new paper.Size(event.point.x - scope.selectionStart.x, event.point.y - scope.selectionStart.y);
                  var pos = new paper.Point((event.point.x + scope.selectionStart.x) / 2, (event.point.y + scope.selectionStart.y) / 2);
                  if (!scope.currentShape) {
                    scope.currentShape = {shape: new paper.Shape.Rectangle(pos, size), decorations: {}};
                    scope.currentShape.shape.strokeColor = Parameters.PATH_STROKECOLOR;
                    scope.currentShape.shape.strokeColor = 'gray';
                  } else {
                    scope.currentShape.shape.position = pos;
                    scope.currentShape.shape.size = size;
                  }
                } else {
                  scope.resetCurrentShape();
                }
              }

              return;
            }

            scope.currentPath.smooth({type:'catmull-rom'});

            // Remove the invalid points that return on the previous values of x
            if (!scope.checkPointCompatibile(event.point)) return;

            scope.currentPath.add(event.point);
          };

          scope.onMouseUp = function(event) {

            // If it is in "No Edit mode" (i.e. no points query before) we need to smooth it
            if (QetchQuery_QueryAPI.isEmpty()) {
              if (scope.currentPath.length === 0) return; // No points has been drawn
              scope.currentPath.simplify(Parameters.SEMPLIFICATION_FACTOR);
              scope.currentPath.fullySelected = true;

              scope.updateQueryLengthInfo();
              scope.updateQueryHeightInfo();
              scope.updateNotOperatorInfo();

              var points = scope.extractPoints();
              QetchQuery_QueryAPI.setPoints(points);
              QetchQuery_DrawRefining.queryUpdated(points);

              // ----------------------
              // DEBUG
              // ----------------------
              var strQuery = '';
              for (var i in scope.currentQuery.points) {
                strQuery += '(' + scope.currentQuery.points[i].x + ',' + scope.currentQuery.points[i].y + ')';
              }
              console.log('Draw query:');
              console.log(strQuery);
              if (Parameters.DEBUG) {
                scope.drawSections();
                // scope.drawTangents();
                // scope.drawCurvatures();
              }
              // ----------------------
              // END DEBUG
              // ----------------------

            } else {
              if (scope.currentShape) {
                var selRect = {
                  x1: scope.selectionStart.x - scope.currentQuery.originX, 
                  x2: event.point.x - scope.currentQuery.originX, 
                  y1: scope.currentQuery.originY - scope.selectionStart.y, 
                  y2: scope.currentQuery.originY - event.point.y
                };
                selRect = QetchQuery_QueryAPI.regexpOpSel(selRect, scope.regexpOp);
                if (selRect === null) {
                  scope.resetCurrentShape();
                  scope.selectionStart = null;
                } else {
                  selRect.x1 = selRect.x1 + scope.currentQuery.originX;
                  selRect.x2 = selRect.x2 + scope.currentQuery.originX;
                  selRect.y1 = scope.currentQuery.originY - selRect.y1;
                  selRect.y2 = scope.currentQuery.originY - selRect.y2;

                  scope.currentShape.shape.size = new paper.Size(selRect.x2 - selRect.x1, selRect.y2 - selRect.y1);
                  scope.currentShape.shape.position = new paper.Point(
                    (selRect.x1 + selRect.x2) / 2, 
                    (selRect.y1 + selRect.y2) / 2
                  );
                  scope.currentShape.shape.strokeColor = '#d9534f';

                  scope.currentShape.decorations.labelBg = new paper.Path([
                    new paper.Point(selRect.x2, selRect.y2),
                    new paper.Point(selRect.x2, selRect.y2 + 22),
                    new paper.Point(selRect.x2 - 22, selRect.y2)
                  ]);
                  scope.currentShape.decorations.labelBg.closed = true;
                  scope.currentShape.decorations.labelBg.fillColor = '#d9534f';

                  scope.currentShape.decorations.label = new paper.PointText(
                    new paper.Point(selRect.x2 - 6, selRect.y2 + 11)
                  );
                  scope.currentShape.decorations.label.justification = 'center';
                  scope.currentShape.decorations.label.fillColor = 'white';
                  scope.currentShape.decorations.label.fontSize = '12px';
                  scope.currentShape.decorations.label.fontFamily = 'Courier';
                  if (scope.regexpOp.op == '+') { // filter for special characters that could create errors
                    scope.currentShape.decorations.label.content = '↻';
                  } else {
                    scope.currentShape.decorations.label.content = scope.regexpOp.op;
                  }
                  scope.shapes.push(scope.currentShape);
                  scope.currentShape = null;
                  scope.selectionStart = null;
                }
              } else {
                scope.updateQueryLengthInfo();
                scope.updateQueryHeightInfo();
                scope.updateNotOperatorInfo();
                var points = scope.extractPoints();
                QetchQuery_QueryAPI.setPoints(points);
                QetchQuery_DrawRefining.queryUpdated(points);
              }

              QetchQuery_QueryAPI.findMatches();
            }

            scope.regexpOp = null;

          };

          scope.resetCurrentShape = function () {
            if (scope.currentShape) {
              scope.currentShape.shape.remove();
              if (scope.currentShape.decorations.labelBg) scope.currentShape.decorations.labelBg.remove();
              if (scope.currentShape.decorations.label) scope.currentShape.decorations.label.remove();
              scope.currentShape = null;
            }
          };

          scope.resetShapes = function () {
            this.resetCurrentShape();
            this.resetNotShape();
            for (var i = 0; i < scope.shapes.length; i++) {
              scope.shapes[i].shape.remove();
              scope.shapes[i].decorations.labelBg.remove();
              scope.shapes[i].decorations.label.remove();
            }
            scope.shapes = [];
            QetchQuery_QueryAPI.resetRegexpOps();
          };

          scope.resetNotShape = function () {
            if (scope.notOpShape) {
              scope.notOpShape.shape.remove();
              scope.notOpShape.decorations.labelBg.remove();
              scope.notOpShape.decorations.label.remove();
              scope.notOpShape = null;
            }
            QetchQuery_QueryAPI.setNotOperator(-1);
          };

          scope.verifyPoints = function () {
            var lastPoint = scope.currentPath.getPointAt(0);
            for (var i = 1; i < scope.currentPath.length; i+= 1) {
              var p = scope.currentPath.getPointAt(i);
              if (lastPoint.x >= p.x) return false;
              lastPoint = p;
            }
            return true;
          };

          scope.extractPoints = function () {
            var points = [], px, p, i;

            if (!scope.currentPath) return [];

            // extract points
            px = scope.currentPath.getPointAt(0).x;
            for (i = 0; i < scope.currentPath.length; i += 0.1) {
              p = scope.currentPath.getPointAt(i);
              if (p.x >= px) {
                points.push(new Qetch.Point(p.x, p.y, p.x, p.y));
                px += Parameters.X_TICK_WIDTH;
              }
            }

            // flip y because in the query paper the point (0,0) is in the left-top corner
            scope.currentQuery.originY = _.max(points, 'y').y;
            for (i in points) points[i].y = scope.currentQuery.originY - points[i].y;

            // translate the query to have the minimum x to 0
            scope.currentQuery.originX = _.min(points, 'x').x;
            for (i in points) points[i].x = points[i].x - scope.currentQuery.originX;

            scope.currentQuery.points = points;

            return points;
          };

          // To better explain to the user that it is a paper where one can draw
          var SQUARED_PAPER_SIZE_LINE_NUMBER = 21;
          var SQUARED_PAPER_COLOR = '#BBB';
          var SQUARED_PAPER_STROKE_WIDTH = 0.5;
          scope.drawSquaredPaperLines = function () {
            var path, squaredPaperSize = scope.size.width / SQUARED_PAPER_SIZE_LINE_NUMBER;
            for (var px = 0; px < scope.size.width; px += squaredPaperSize) {
              path = new paper.Path();
              path.strokeColor = SQUARED_PAPER_COLOR;
              path.strokeWidth = SQUARED_PAPER_STROKE_WIDTH;
              path.moveTo(new paper.Point(px, 0));
              path.lineTo(new paper.Point(px, scope.size.height));
            }
            for (var py = 0; py < scope.size.height; py += squaredPaperSize) {
              path = new paper.Path();
              path.strokeColor = SQUARED_PAPER_COLOR;
              path.strokeWidth = SQUARED_PAPER_STROKE_WIDTH;
              path.moveTo(new paper.Point(0, py));
              path.lineTo(new paper.Point(scope.size.width, py));
            }
            paper.view.draw();
          };






          /* -------------------------------------------
           * DEBUG functions
           * ------------------------------------------- */

          document.drawAndGetSmoothResults = function (ptsStr) {
            QetchQuery_QueryAPI.setQueryLength(null, null, false);
            QetchQuery_QueryAPI.setQueryHeight(null, null);
            Parameters.ALGORITHM_TO_USE = 'qetch';
            console.log('algorithm set to: ', Parameters.ALGORITHM_TO_USE);
            scope.drawOnPaper(DatasetAPI.pointsListToPointArray(ptsStr), false, true);
            setTimeout(function () {
              var topKRes = document.getTopKResults(document.topk);
              for (var i = 0; i < topKRes.length; i++) {
                document.txt += topKRes[i].match + '\t' + Parameters.ALGORITHM_TO_USE + (Parameters.LAST_EXECUTION_QUERY_LENGTH ? 'q' : '') + '\t' + (document.lastQueryIdx - 1) + '\t' +
                  DatasetAPI.pointArrayToPointsList(DatasetAPI.getPointsFromInterval(topKRes[i].snum, 0, topKRes[i].minPos, topKRes[i].maxPos, 1)) + '\t' +
                  DatasetAPI.pointArrayToPointsList(DatasetAPI.getPointsFromInterval(topKRes[i].snum, topKRes[i].smoothIteration, topKRes[i].minPos, topKRes[i].maxPos, 1)) + '\t' +
                  DatasetAPI.pointArrayToPointsList(DatasetAPI.getPointsFromInterval(topKRes[i].snum, 0, topKRes[i].minPos, topKRes[i].maxPos, 0)) + '\t' +
                  DatasetAPI.pointArrayToPointsList(DatasetAPI.getPointsFromInterval(topKRes[i].snum, topKRes[i].smoothIteration, topKRes[i].minPos, topKRes[i].maxPos, 0)) +
                  '\n'
              }

              QetchQuery_QueryAPI.clear();
              setTimeout(document.getSmoothResOfQuery, 1000);
            }, 3000);
          };
          document.inspectQueriesSmoothResults = function (queryName, k, tolerance) {
            document.txt = 'match\talg\tquerynum\tdatasetpoints\tsmoothdatasetpoints\tmatchedpoints\tsmoothedmatchedpoints\n';
            document.topk = k;
            document.queryName = queryName;

            $.get('/tests/' + queryName + '.csv', function(response) {
              var queries = response.split('\n');
              for (var i in queries) queries[i] = queries[i].split('\t');

              document.queriesToCheck = queries;
              document.lastQueryIdx = 0;

              QetchQuery_QueryAPI.clear();
              setTimeout(document.getSmoothResOfQuery, 1000);
            });
          };
          document.getSmoothResOfQuery = function () {
            if (document.lastQueryIdx >= document.queriesToCheck.length) {

              var blob = new Blob([document.txt], {type: 'text/plain;charset=utf-8'});
              saveAs(blob, document.queryName + '-results.csv');

              console.log('PROCESS END');
              return;
            }

            document.drawAndGetSmoothResults(document.queriesToCheck[document.lastQueryIdx][6]);
            document.lastQueryIdx++;
          };



          document.drawAndGetTopKResults = function (ptsStr) {
            QetchQuery_QueryAPI.setQueryLength(null, null, false);
            QetchQuery_QueryAPI.setQueryHeight(null, null);
            Parameters.ALGORITHM_TO_USE = 'qetch';
            console.log('algorithm set to: ', Parameters.ALGORITHM_TO_USE);
            scope.drawOnPaper(DatasetAPI.pointsListToPointArray(ptsStr), false, true);
            setTimeout(function () {
              var topKRes = document.getTopKResults(document.topk);
              for (var i = 0; i < topKRes.length; i++) {
                document.txt += topKRes[i].match + '\t' + Parameters.ALGORITHM_TO_USE + (Parameters.LAST_EXECUTION_QUERY_LENGTH ? 'q' : '') + '\t' + (document.lastQueryIdx - 1) + '\t' +
                  DatasetAPI.pointArrayToPointsList(DatasetAPI.getPointsFromInterval(topKRes[i].snum, 0 /*topKRes[i].smoothIteration*/, topKRes[i].minPos, topKRes[i].maxPos, 1), true) +
                  '\n'
              }

              QetchQuery_QueryAPI.setQueryLength(document.queryLength, document.tolerance, false);

              Parameters.ALGORITHM_TO_USE = 'dtw';
              console.log('algorithm set to: ', Parameters.ALGORITHM_TO_USE);
              scope.drawOnPaper(DatasetAPI.pointsListToPointArray(ptsStr), false, true);
              setTimeout(function () {
                var topKRes = document.getTopKResults(document.topk);
                for (var i = 0; i < topKRes.length; i++) {
                  document.txt += topKRes[i].match + '\t' + Parameters.ALGORITHM_TO_USE + (Parameters.LAST_EXECUTION_QUERY_LENGTH ? 'q' : '') + '\t' + (document.lastQueryIdx - 1) + '\t' +
                    DatasetAPI.pointArrayToPointsList(DatasetAPI.getPointsFromInterval(topKRes[i].snum, 0 /*topKRes[i].smoothIteration*/, topKRes[i].minPos, topKRes[i].maxPos, 1), true) +
                    '\n'
                }

                Parameters.ALGORITHM_TO_USE = 'ed';
                console.log('algorithm set to: ', Parameters.ALGORITHM_TO_USE);
                scope.drawOnPaper(DatasetAPI.pointsListToPointArray(ptsStr), false, true);
                setTimeout(function () {
                  var topKRes = document.getTopKResults(document.topk);
                  for (var i = 0; i < topKRes.length; i++) {
                    document.txt += topKRes[i].match + '\t' + Parameters.ALGORITHM_TO_USE + (Parameters.LAST_EXECUTION_QUERY_LENGTH ? 'q' : '') + '\t' + (document.lastQueryIdx - 1) + '\t' +
                      DatasetAPI.pointArrayToPointsList(DatasetAPI.getPointsFromInterval(topKRes[i].snum, 0 /*topKRes[i].smoothIteration*/, topKRes[i].minPos, topKRes[i].maxPos, 1), true) +
                      '\n'
                  }

                  Parameters.ALGORITHM_TO_USE = 'qetch';
                  console.log('algorithm set to: ', Parameters.ALGORITHM_TO_USE);
                  scope.drawOnPaper(DatasetAPI.pointsListToPointArray(ptsStr), false, true);
                  setTimeout(function () {
                    var topKRes = document.getTopKResults(document.topk);
                    for (var i = 0; i < topKRes.length; i++) {
                      document.txt += topKRes[i].match + '\t' + Parameters.ALGORITHM_TO_USE + (Parameters.LAST_EXECUTION_QUERY_LENGTH ? 'q' : '') + '\t' + (document.lastQueryIdx - 1) + '\t' +
                        DatasetAPI.pointArrayToPointsList(DatasetAPI.getPointsFromInterval(topKRes[i].snum, 0 /*topKRes[i].smoothIteration*/, topKRes[i].minPos, topKRes[i].maxPos, 1), true) +
                        '\n'
                    }

                    QetchQuery_QueryAPI.clear();
                    setTimeout(document.getTopKOfQuery, 1000);

                  }, (Parameters.ALGORITHM_TO_USE == 'dtw' || Parameters.ALGORITHM_TO_USE == 'ed') ? 7000 : 3000);

                }, (Parameters.ALGORITHM_TO_USE == 'dtw' || Parameters.ALGORITHM_TO_USE == 'ed') ? 7000 : 3000);

              }, (Parameters.ALGORITHM_TO_USE == 'dtw' || Parameters.ALGORITHM_TO_USE == 'ed') ? 7000 : 3000);

            }, (Parameters.ALGORITHM_TO_USE == 'dtw' || Parameters.ALGORITHM_TO_USE == 'ed') ? 7000 : 3000);
          };
          document.inspectQueriesTopKResults = function (queryName, k, queryLength, tolerance) {
            document.txt = 'match\talg\tquerynum\tpoints\n';
            document.topk = k;
            document.queryName = queryName;
            document.queryLength = queryLength;
            document.tolerance = tolerance;

            $.get('/tests/' + queryName + '.csv', function(response) {
              var queries = response.split('\n');
              for (var i in queries) queries[i] = queries[i].split('\t');

              document.queriesToCheck = queries;
              document.lastQueryIdx = 1; // 1 because is a CSV

              QetchQuery_QueryAPI.clear();
              setTimeout(document.getTopKOfQuery, 1000);
            });
          };
          document.getTopKOfQuery = function () {
            if (document.lastQueryIdx >= document.queriesToCheck.length) {

              var blob = new Blob([document.txt], {type: 'text/plain;charset=utf-8'});
              saveAs(blob, document.queryName + '-results.csv');

              console.log('PROCESS END');
              return;
            }

            document.drawAndGetTopKResults(document.queriesToCheck[document.lastQueryIdx][6]);
            document.lastQueryIdx++;
          };
          document.drawOnPaper = function (ptsStr, noInvert) {
            scope.drawOnPaper(DatasetAPI.pointsListToPointArray(ptsStr), false, noInvert);
          };
          document.inspectQueries = function (queryName, positions) {
            document.queriesToCheckPositions = positions;
            document.queryName = queryName;

            $.get('/tests/' + queryName + '.csv', function(response) {
              var queries = response.split('\n');
              for (var i in queries) queries[i] = queries[i].split('\t');

              // queries = [
              //   [],
              //   ["qst1-001", "000", "000", "000", "000", "(38,157)(40,144)(42,132)(44,121)(46,109)(48,97)(50,95)(52,94)(54,94)(56,94)(58,94)(60,94)(62,94)(64,94)(66,94)(68,94)(70,94)(72,94)(74,94)(76,94)(78,94)(80,94)(82,94)(84,95)(86,95)(88,95)(90,95)(92,95)(94,95)(96,95)(98,96)(100,96)(102,96)(104,96)(106,96)(108,97)(110,97)(112,103)(114,119)(116,153)(118,153)(120,153)(122,153)(124,153)(126,154)(128,154)(130,154)(132,155)(134,155)(136,155)(138,155)(140,155)(142,155)(144,155)(146,155)(148,155)(150,155)(152,155)(154,155)(156,155)(158,155)(160,155)(162,155)(164,154)(166,154)(168,154)"],
              //   ["qst1-002", "000", "000", "000", "000", "(35,122)(37,114)(39,109)(41,104)(43,99)(45,94)(47,89)(49,86)(51,84)(53,82)(55,80)(57,78)(59,77)(61,76)(63,75)(65,74)(67,73)(69,72)(71,71)(73,71)(75,70)(77,70)(79,69)(81,69)(83,69)(85,70)(87,70)(89,71)(91,72)(93,74)(95,76)(97,79)(99,82)(101,86)(103,90)(105,96)(107,102)(109,109)(111,116)(113,122)(115,127)(117,139)(119,147)(121,150)(123,153)(125,155)(127,157)(129,158)(131,159)(133,160)(135,161)(137,162)(139,162)(141,162)(143,161)(145,160)(147,159)(149,158)(151,156)(153,153)(155,149)(157,144)"]
              // ];

              document.queriesToCheck = queries;
              document.lastQueryIdx = 1; // 1 because is a CSV

              QetchQuery_QueryAPI.clear();
              setTimeout(document.drawAndWait, 1000);
            });
          };
          document.waitingTimeDTW = 10000;
          document.waitingTimeQetch = 4000;
          document.drawAndWait = function () {
            if (document.lastQueryIdx >= document.queriesToCheck.length) {
              var txt = '';
              for (var i = 0; i < document.queriesToCheck.length; i++) {
                var line = document.queriesToCheck[i];
                if (line[0] !== undefined && line[1] !== undefined && line[2] !== undefined) {
                  txt += line[0] + '\t' + line[1] + '\t' + line[2] + '\t' + line[3] + '\t' + line[4] + '\t' + line[5] + '\t' + line[6] + '\n';
                }
              }
              var blob = new Blob([txt], {type: 'text/plain;charset=utf-8'});
              saveAs(blob, document.queryName + '-results-' +
                Parameters.ALGORITHM_TO_USE +
                (Parameters.LAST_EXECUTION_QUERY_LENGTH ? '-querysize' : '') +
                (Parameters.RESCALING_Y ? '-yrescaling' : '') + '.csv');
              return;
            }
            var query = document.queriesToCheck[document.lastQueryIdx][6];
            if (query) {
              document.drawOnPaper(query, true);
              setTimeout(document.checkResultAndNext, (Parameters.ALGORITHM_TO_USE == 'dtw' || Parameters.ALGORITHM_TO_USE == 'ed') ?  document.waitingTimeDTW : document.waitingTimeQetch);
            } else {
              document.lastQueryIdx++;
              setTimeout(document.drawAndWait, 100);
            }
          };
          document.checkResultAndNext = function () {
            var positions = document.queriesToCheckPositions;
            var res = document.checkResultIn(positions);

            console.log(res);

            if (res) {
              document.queriesToCheck[document.lastQueryIdx][1] = res.position;
              document.queriesToCheck[document.lastQueryIdx][2] = res.matchValue;
              document.queriesToCheck[document.lastQueryIdx][3] = res.noResults;
              document.queriesToCheck[document.lastQueryIdx][4] = Qetch.DEBUG_LAST_EXECUTING_TIME;
              document.queriesToCheck[document.lastQueryIdx][5] = res.scores;
            }
            document.lastQueryIdx++;
            setTimeout(document.drawAndWait, 100) ;
          };

          /* starting point for the 1NN test
           * alg is 'ed', 'qetch' or 'dtw'
          */
          document.inspect1NN = function (alg) {
            $.get('/tests/nndataset.csv', function(response) {
              console.log('1NN data loaded');
              var i;
              var queries = response.split('\n');
              console.log('queries: ', queries.length);
              for (i in queries) {
                queries[i] = queries[i].split('\t');
                queries[i][2] = DatasetAPI.pointsListToPointArray(queries[i][2]);

                if (alg == 'qetch') {
                  //smoothing curve, only qetch needs a sigtly smooth for sketches coming from mturk,
                  //since that version doesn't implement the same smooth as this interface.
                  //Only for Qetch, we don't want to influence results of DTW or ED, they don't use sectionPoints
                  Data_Utils.smooth(queries[i][2], 2, 4);

                  // var ptsLst = queries[i][2];
                  //
                  // scope.currentPath = new paper.Path();
                  // var minX = _.min(ptsLst, 'x').x, maxX = _.max(ptsLst, 'x').x;
                  // var minY = _.min(ptsLst, 'y').y, maxY = _.max(ptsLst, 'y').y;
                  // if (minY < 0) {
                  //   maxY = maxY - minY;
                  //   minY = 0;
                  // }
                  // for (var ptI = 0; ptI < ptsLst.length; ptI++) {
                  //   var y = (maxY - minY) - ptsLst[ptI].y;
                  //   scope.currentPath.add(new paper.Point(ptsLst[ptI].x, y));
                  // }
                  // scope.currentPath.smooth({type:'catmull-rom'});
                  // scope.currentPath.simplify();
                  // scope.currentPath.fullySelected = true;
                  // queries[i][2] = scope.extractPoints();
                }
              }

              // queries = [ // name, label, points
              //   [],
              //   ["qst1-001", "ihas", "(38,157)(40,144)(42,132)(44,121)(46,109)(48,97)(50,95)(52,94)(54,94)(56,94)(58,94)(60,94)(62,94)(64,94)(66,94)(68,94)(70,94)(72,94)(74,94)(76,94)(78,94)(80,94)(82,94)(84,95)(86,95)(88,95)(90,95)(92,95)(94,95)(96,95)(98,96)(100,96)(102,96)(104,96)(106,96)(108,97)(110,97)(112,103)(114,119)(116,153)(118,153)(120,153)(122,153)(124,153)(126,154)(128,154)(130,154)(132,155)(134,155)(136,155)(138,155)(140,155)(142,155)(144,155)(146,155)(148,155)(150,155)(152,155)(154,155)(156,155)(158,155)(160,155)(162,155)(164,154)(166,154)(168,154)"],
              // ];

              var parts = 5;
              for (var i = 0; i < 2; i++) queries = shuffle(queries);
              var queriesParts = document.splitForTraininset(queries, parts);
              console.log('queries split in ', parts);

              var commonErrors = {};
              var queryAccuracy = {};
              var avg = 0;

              function launch(i) {
                if (i >= queriesParts.length) {
                  for (var key in commonErrors) {
                    console.log(key, ' ', commonErrors[key]);
                  }
                  for (var key in queryAccuracy) {
                    console.log(key, ' ', queryAccuracy[key]);
                  }
                  console.log(avg/parts);
                  return;
                }
                var testSet = queriesParts.slice(0, i).concat(queriesParts.slice(i + 1, queriesParts.length));
                document.do1NNEvaluation(queriesParts[i], testSet, alg, commonErrors, queryAccuracy, function (res) {
                  console.log(res.correct + ' / ' + res.tot);
                  avg += res.correct / res.tot;
                  launch(i+1)
                });
              }

              launch(0);

            });
          };

          document.splitForTraininset = function (queries, partNum) {
            var parts = [], i;
            for (i = 0; i < partNum; i++) parts[i] = [];
            for (i = 0; i < queries.length; i++) {
              parts[i % partNum].push(queries[i]);
            }
            return parts;
          };

          document.do1NNEvaluation = function (trainingSet, testSets, alg, commonErrors, queryAccuracy, callback) {
            var res = {tot: 0, correct: 0};

            function do1NNEvaluationInTestSetIt(i) {
              if (i >= testSets.length) {
                callback(res);
                return;
              }
              setTimeout(function () {
                console.log('run with test set ' + i + ' (length = ' + testSets[i].length + ') ...');
                document.do1NNEvaluationInTestSet(trainingSet, testSets[i], alg, res, commonErrors, queryAccuracy);
                do1NNEvaluationInTestSetIt(i + 1);
              }, 1);
            }

            do1NNEvaluationInTestSetIt(0);
          };

          document.do1NNEvaluationInTestSet = function (trainingSet, testSet, alg, res, commonErrors, queryAccuracy) {
            for (var tsi = 0; tsi < testSet.length; tsi++) {
              var query = testSet[tsi];
              var qPoints = query[2];
              var qTangents = QetchQuery_QueryAPI.extractTangents(qPoints);
              var qSections = QetchQuery_QueryAPI.findCurveSections(qTangents, qPoints, Parameters.DIVIDE_SECTION_MIN_HEIGHT_QUERY);
              var closest = -1, closestDistance = Number.MAX_VALUE;
              var closestReduced = false, closestExpanded = false;
              for (var tri = 0; tri < trainingSet.length; tri++) {
                var dPoints = trainingSet[tri][2];
                var val;

                if (alg == 'qetch') {
                  var dTangents = QetchQuery_QueryAPI.extractTangents(dPoints);
                  var dSections = QetchQuery_QueryAPI.findCurveSections(dTangents, dPoints, Parameters.DIVIDE_SECTION_MIN_HEIGHT_QUERY);
                  val = QetchQuery_QueryAPI.calculatePointsMatch(qSections, dSections);
                } else {
                  val = QetchQuery_QueryAPI.calculateDTWorED(qPoints, dPoints, alg);
                }

                if (val !== null && val.match < closestDistance) {
                  closest = tri;
                  closestDistance = val.match;
                  closestReduced = val.reduced;
                  closestExpanded = val.expanded;
                }
              }

              if (query[1] in queryAccuracy) {
                queryAccuracy[query[1]].total++;
              } else {
                queryAccuracy[query[1]] = {correct: 0, total: 1};
              }

              if (closest > 0) {
                if (query[1] !== trainingSet[closest][1]) {
                  // if (query[1] == 'has' && trainingSet[closest][1] == 'sr') {
                  //   console.log(query[1])
                  // }

                  // if (closestReduced) console.log('reduced');
                  // if (closestExpanded) console.log('expanded');

                  if (query[1] + ' ' + trainingSet[closest][1] in commonErrors) {
                    commonErrors[query[1] + ' ' + trainingSet[closest][1]]++;
                  } else {
                    commonErrors[query[1] + ' ' + trainingSet[closest][1]] = 1;
                  }
                }

                if (query[1] == trainingSet[closest][1]) {
                  queryAccuracy[query[1]].correct++;
                  res.correct++;
                }

              }

              res.tot++;

            }
          };

          scope.drawCurvatures = function () {
            var i, myCircle;
            for (i = 0; i < QetchQuery_QueryAPI.curvatures.length; i++) {
              var c = QetchQuery_QueryAPI.curvatures[i];
              myCircle = new paper.Path.Circle({
                center: new paper.Point(c.point.x, c.point.y),
                radius: 1
              });
              myCircle.strokeColor = myCircle.fillColor = 'rgb(0,' + Math.ceil(255 * c.curvature) + ',0)';
            }
          };

          scope.drawTangents = function () {
            var i, p, tg, path, TANGENT_SIZE = 50;
            for (i = 0; i < QetchQuery_QueryAPI.tangents.length; i++) {
              p = QetchQuery_QueryAPI.tangents[i].point;
              tg = - QetchQuery_QueryAPI.tangents[i].tangent; // The Y-axis is flipped, and the tangent must be negated
              path = new paper.Path();
              path.strokeColor = 'red';
              path.moveTo(new paper.Point(p.x - TANGENT_SIZE, p.y - tg * TANGENT_SIZE));
              path.lineTo(new paper.Point(p.x + TANGENT_SIZE, p.y + tg * TANGENT_SIZE));
            }
          };

          scope.drawSections = function () {
            var i, SECTION_INDICATOR_SIZE = 3;
            for (i = 0; i < QetchQuery_QueryAPI.sections.length; i++) {
                var sectionPoints = QetchQuery_QueryAPI.sections[i].points;
                var p = _.last(sectionPoints);
                var s = new paper.Shape.Circle(new paper.Point(p.origX, p.origY), SECTION_INDICATOR_SIZE);
                s.strokeColor = 'red';
            }
            paper.view.draw();
          };

          /* -------------------------------------------
           * END DEBUG functions
           * ------------------------------------------- */







        }],
        link: function (scope, element, attrs) {
          paper.setup(element[0]);
          var tool = new paper.Tool();
          tool.onMouseDown = scope.onMouseDown;
          tool.onMouseDrag = scope.onMouseDrag;
          tool.onMouseUp = scope.onMouseUp;
          tool.onKeyUp = scope.onKeyUp;
        }
    };

}]);