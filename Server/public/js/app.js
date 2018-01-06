var Qetch = angular.module('Qetch', ['ngResource', 'ngAnimate', 'Dataset', 'Queries', 'QetchQuery', 'frapontillo.bootstrap-switch', 'ui.bootstrap-slider']);

Qetch.value('Parameters', {
  DEBUG: false,
  X_TICK_WIDTH: 2, // px
  MAX_MATCH_GOOD: 5,
  MAX_MATCH_MEDIUM: 40,
  MATCH_LINE_COLOR: function (match) {
    if (match < 5) return 'rgba(92, 184, 92, 0.8)';
    if (match < 40) return 'rgba(240, 173, 78, 0.7)';
    return 'rgba(217, 83, 79, 0.5)';
  },
  MATCHES_SEPARATOR_COLOR: function (match) {
    if (match < 5) return 'rgba(92, 184, 92, 0.9)';
    if (match < 40) return 'rgba(240, 173, 78, 0.8)';
    return 'rgba(217, 83, 79, 0.6)';
  },

  // Plot
  plotMargin: {top: 15, right: 15, bottom: 20, left: 40},
  navigatorMargin: {top: 15, right: 15, bottom: 40, left: 40},
  ALGORITHM_TO_USE: 'qetch',
  ASP_RATIO: [0.1, 10],
  MAX_REGEX_IT: 25,
  GROUPING_EQUAL_MATCH_TOLERANCE: 10, /* 10 for tests. Also used 1 */
  DATASET_EVENTS: {
    DATASETS_DEFINITION_LOADED: 'DatasetAPI:dataset-definition-loaded',
    DATASET_LOADED: 'DatasetAPI:data-loaded',
    DATA_CHANGED: 'DatasetAPI:data-changed',
    MATCHES_CHANGED: 'DatasetAPI:matches-changed',
    SHOW_MATCHES: 'DatasetAPI:show-matches',
    DATA_REPRESENTATION_CHANGED: 'DatasetAPI:data-representation-changed'
  },

  // Query draw
  SEMPLIFICATION_FACTOR: 10,
  PATH_STROKEWIDTH: 5,
  PATH_STROKECOLOR: '#333333',
  PREVIEW_PATH_STROKECOLOR: '#FF3F00',

  // The query preview drawn
  QUERY_PREVIEW_WIDTH: 60,
  QUERY_PREVIEW_HEIGHT: 50,
  QUERY_PREVIEW_DRAW_PADDING: 5,
  QUERY_AUTO_DRAW_PADDING: 20,

  /* the maximum metric, to consider a match as a match. */
  MATCH_METRIC_MAXIMUM_VALUE: 100,
  CHECK_QUERY_COMPATIBILITY: true, /* true for tests, false for 1NN */

  /* to filter the matches that selects the majority of the database */
  NOT_OPERATOR_MAX_RELATIVE_LENGTH: 0.5,
  NOT_OPERATOR_INITIAL_VALUE: 0, // 0 auto calculate value (auto calculate is better with big datasets)

  VALUE_DIFFERENCE_WEIGHT: 1,
  RESCALING_COST_WEIGHT: 1,
  RESCALING_Y: true, /* true for tests*/

  QUERYLENGTH_SLIDING_WINDOW_STEP: 1, /* percentage of query length, 10 for topk, 1 for normal tests */
  QUERYLENGTH_INITIAL_STRICT_MODE: false, // false for tests

  MIN_MATCH_VALUE_FOR_PREDEFINED_QUERY: 0.5, // to be multiplied by the number of sections. 0.5 for tests (1 also used)

  START_END_CUT_IN_SUBPARTS: true, // the first and last sections are cut to have a good fit
  START_END_CUT_IN_SUBPARTS_IN_RESULTS: true, /* the first and last sections are cut as well in the results,
   or are returned highlighting the whole section. false in tests */

  // Minimum height (in percentage, related to the entire section) that is needed to create a new section
  // This is to avoid that very small sections that are similar to a horizontal line create many sections
  // Without it the algorithm that divides the sequence in sections would be too much sensible to noises
  DIVIDE_SECTION_MIN_HEIGHT_DATA: 0.01, // was 0.01 for tests
  DIVIDE_SECTION_MIN_HEIGHT_QUERY: 0.01, // 0.01 for tests, 0.1 for 1NN

  // Smooth algorithm
  SMOOTH_MIN_SIGN_VARIATION_RATIO: 0.9,
  SMOOTH_MINIMUM_SIGN_VARIATIONS_NUM: 10,
  SMOOTH_SMOOTHED_HEIGHT_HEIGHT_MIN_RATIO: 0.5,
  SMOOTH_ITERATIONS_STEPS: 6,
  SMOOTH_MAXIMUM_ATTEMPTS: 100,

  // As in the user studies
  // SMOOTH_MIN_SIGN_VARIATION_RATIO: 0.9,
  // SMOOTH_MINIMUM_SIGN_VARIATIONS_NUM: 1,
  // SMOOTH_SMOOTHED_HEIGHT_HEIGHT_MIN_RATIO: 0.01,
  // SMOOTH_ITERATIONS_STEPS: 6,
  // SMOOTH_MAXIMUM_ATTEMPTS: 100000,

  // // Query smooth
  // QSMOOTH: false,
  // QSMOOTH_MIN_SIGN_VARIATION_RATIO: 0.5,
  // QSMOOTH_MINIMUM_SIGN_VARIATIONS_NUM: 5,
  // QSMOOTH_MINIMUM_SECT_RELATIVE_WITH_MAX_RATIO: 0.15,

  // query compatibility
  QUERY_SIGN_MAXIMUM_TOLERABLE_DIFFERENT_SIGN_SECTIONS: 0.5, /* if the number of sections is N, and the number of
   sections with a different sign is D. The algorithm consider the two subsequences as incompatible if D/N > 0.5 */

  REMOVE_EQUAL_MATCHES: true, //keep only one (best) match if the same area is selected in different smooth iterations
  // with not experiments it's better a false, so every smooth iteration has a not match, so they are easier to view

  QUERY_EVENTS: {
    DRAW: 'QetchQuery:draw',
    DRAW_PREVIEW: 'QetchQuery:draw-preview',
    CLEAN_DRAW_PREVIEW: 'QetchQuery:clean-draw-preview',
    CLEAR: 'QetchQuery:clear'
  },

  QUERYPAPER_EVENTS: {
    ADD_REGEXP_OP: 'QetchQuery:add-regexp-op'
  },

  QUERY_REFINEMENT_EVENTS: {
    PREDEFINED_QUERIES_LOADED: 'QetchQuery:predefinedQueriesLoaded',
    FN_QUERIES_LOADED: 'QetchQuery:fnQueriesLoaded',
    SUGGEST_PREDEFINED_QUERY: 'QetchQuery:suggestPredefinedQuery',
    QUERY_HISTORY_UPDATE: 'QetchQuery:queryHistoryUpdate',
    QUERY_FN_SUGGESTION: 'QetchQuery:query-fn-suggestion',
    SET_QUERY_LENGTH: 'QetchQuery:query-length',
    SET_QUERY_HEIGHT: 'QetchQuery:query-height',
    SET_QUERY_HORIZONTAL_OFFSET: 'QetchQuery:query-horizontal-offset',
    SET_QUERY_VERTICAL_OFFSET: 'QetchQuery:query-vertical-offset'
  }

});

// Dataset module
var Dataset = angular.module('Dataset', []);

// Queries module
var Queries = angular.module('Queries', []);

// QetchQuery module
var QetchQuery = angular.module('QetchQuery', []);

Qetch.controller('MainCtrl', ['$rootScope', '$scope', 'QetchQuery_QueryAPI', 'Parameters',
  function ($rootScope, $scope, QetchQuery_QueryAPI, Parameters) {
    $scope.Parameters = Parameters;
    $scope.datasetAvailable = false;

    $scope.notifyDatasetLoading = function () {
      $('#pleaseWaitDialog').modal('show');
    };

    $scope.notifyDatasetAvailable = function () {
      $scope.datasetAvailable = true;
      $('#pleaseWaitDialog').modal('hide');
    };

  }]);

Qetch.directive('includeReplace', function () {
  return {
    require: 'ngInclude',
    restrict: 'A',
    link: function (scope, el) {
      el.replaceWith(el.children());
    }
  };
});