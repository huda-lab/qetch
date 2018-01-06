/**
 * @title DTW API
 * @author Elmar Langholz
 */

var EPSILON = 2.2204460492503130808472633361816E-16;

function validateOptions(options) {
    if (typeof options !== 'object') {
        throw new TypeError('Invalid options type: expected an object');
    } else if (typeof options.distanceMetric !== 'string' && typeof options.distanceFunction !== 'function') {
        throw new TypeError('Invalid distance types: expected a string distance type or a distance function');
    } else if (typeof options.distanceMetric === 'string' && typeof options.distanceFunction === 'function') {
        throw new Error('Invalid parameters: provide either a distance metric or function but not both');
    }

    if (typeof options.distanceMetric === 'string') {
        var normalizedDistanceMetric = options.distanceMetric.toLowerCase();
        if (normalizedDistanceMetric !== 'manhattan' && normalizedDistanceMetric !== 'euclidean'
            && normalizedDistanceMetric !== 'squaredeuclidean') {
            throw new Error('Invalid parameter value: Unknown distance metric \'' + options.distanceMetric + '\'');
        }
    }
}

function retrieveDistanceFunction(distanceMetric) {
    var normalizedDistanceMetric = distanceMetric.toLowerCase();
    var distanceFunction = null;
    if (normalizedDistanceMetric === 'manhattan') {
        distanceFunction = this.manhattanDistance;
    } else if (normalizedDistanceMetric === 'euclidean') {
        distanceFunction = this.euclideanDistance;
    } else if (normalizedDistanceMetric === 'squaredeuclidean') {
        distanceFunction = this.squaredEuclideanDistance;
    }

    return distanceFunction;
}

/**
 * Create a DTWOptions object
 * @class DTWOptions
 * @member {string} distanceMetric The distance metric to use: `'manhattan' | 'euclidean' | 'squaredEuclidean'`.
 * @member {function} distanceFunction The distance function to use. The function should accept two numeric arguments and return the numeric distance. e.g. function (a, b) { return a + b; }
 */

/**
 * Create a DTW object
 * @class DTW
 */
/**
 * Initializes a new instance of the `DTW`. If no options are provided the squared euclidean distance function is used.
 * @function DTW
 * @param {DTWOptions} [options] The options to initialize the dynamic time warping instance with.
 */
/**
 * Computes the optimal match between two provided sequences.
 * @method compute
 * @param {number[]} firstSequence The first sequence.
 * @param {number[]} secondSequence The second sequence.
 * @param {number} [window] The window parameter (for the locality constraint) to use.
 * @returns {number} The similarity between the provided temporal sequences.
 */
/**
 * Retrieves the optimal match between two provided sequences.
 * @method path
 * @returns {number[]} The array containing the optimal path points.
 */
var DTW = function (options) {
    var state = { distanceCostMatrix: null };
    if (typeof options === 'undefined') {
        state.distance = this.squaredEuclideanDistance;
    } else {
        validateOptions(options);
        if (typeof options.distanceMetric === 'string') {
            state.distance = retrieveDistanceFunction(options.distanceMetric);
        } else if (typeof options.distanceFunction === 'function') {
            state.distance = options.distanceFunction;
        }
    }

    this.compute = function (firstSequence, secondSequence, window) {
        var cost = Number.POSITIVE_INFINITY;
        if (typeof window === 'undefined') {
            cost = this.computeOptimalPath(firstSequence, secondSequence, state);
        } else if (typeof window === 'number') {
            cost = this.computeOptimalPathWithWindow(firstSequence, secondSequence, window, state);
        } else {
            throw new TypeError('Invalid window parameter type: expected a number');
        }

        return cost;
    };

    this.path = function () {
        var path = null;
        if (state.distanceCostMatrix instanceof Array) {
            path = this.retrieveOptimalPath(state);
        }

        return path;
    };
};

DTW.prototype.validateComputeParameters = function (s, t) {
    this.validateSequence(s, 'firstSequence');
    this.validateSequence(t, 'secondSequence');
};

DTW.prototype.computeOptimalPath = function (s, t, state) {
    this.validateComputeParameters(s, t);
    var start = new Date().getTime();
    state.m = s.length;
    state.n = t.length;
    var distanceCostMatrix = this.createMatrix(state.m, state.n, Number.POSITIVE_INFINITY);

    distanceCostMatrix[0][0] = state.distance(s[0], t[0]);

    for (var rowIndex = 1; rowIndex < state.m; rowIndex++) {
        var cost = state.distance(s[rowIndex], t[0]);
        distanceCostMatrix[rowIndex][0] = cost + distanceCostMatrix[rowIndex - 1][0];
    }

    for (var columnIndex = 1; columnIndex < state.n; columnIndex++) {
        var cost = state.distance(s[0], t[columnIndex]);
        distanceCostMatrix[0][columnIndex] = cost + distanceCostMatrix[0][columnIndex - 1];
    }

    for (var rowIndex = 1; rowIndex < state.m; rowIndex++) {
        for (var columnIndex = 1; columnIndex < state.n; columnIndex++) {
            var cost = state.distance(s[rowIndex], t[columnIndex]);
            distanceCostMatrix[rowIndex][columnIndex] =
                cost + Math.min(
                    distanceCostMatrix[rowIndex - 1][columnIndex],          // Insertion
                    distanceCostMatrix[rowIndex][columnIndex - 1],          // Deletion
                    distanceCostMatrix[rowIndex - 1][columnIndex - 1]);     // Match
        }
    }

    var end = new Date().getTime();
    var time = end - start;
    state.distanceCostMatrix = distanceCostMatrix;
    state.similarity = distanceCostMatrix[state.m - 1][state.n - 1];
    return state.similarity;
};

DTW.prototype.computeOptimalPathWithWindow = function (s, t, w, state) {
    this.validateComputeParameters(s, t);
    var start = new Date().getTime();
    state.m = s.length;
    state.n = t.length;
    var window = Math.max(w, Math.abs(s.length - t.length));
    var distanceCostMatrix = this.createMatrix(state.m + 1, state.n + 1, Number.POSITIVE_INFINITY);
    distanceCostMatrix[0][0] = 0;

    for (var rowIndex = 1; rowIndex <= state.m; rowIndex++) {
        for (var columnIndex = Math.max(1, rowIndex - window); columnIndex <= Math.min(state.n, rowIndex + window); columnIndex++) {
            var cost = state.distance(s[rowIndex - 1], t[columnIndex - 1]);
            distanceCostMatrix[rowIndex][columnIndex] =
                cost + Math.min(
                distanceCostMatrix[rowIndex - 1][columnIndex],          // Insertion
                distanceCostMatrix[rowIndex][columnIndex - 1],          // Deletion
                distanceCostMatrix[rowIndex - 1][columnIndex - 1]);     // Match
        }
    }

    var end = new Date().getTime();
    var time = end - start;
    distanceCostMatrix.shift();
    distanceCostMatrix = distanceCostMatrix.map(function (row) {
        return row.slice(1, row.length);
    });
    state.distanceCostMatrix = distanceCostMatrix;
    state.similarity = distanceCostMatrix[state.m - 1][state.n - 1];
    return state.similarity;
};

DTW.prototype.retrieveOptimalPath = function (state) {
    var start = new Date().getTime();

    var rowIndex = state.m - 1;
    var columnIndex = state.n - 1;
    var path = [[rowIndex, columnIndex]];
    var epsilon = 1e-14;
    while ((rowIndex > 0) || (columnIndex > 0)) {
        if ((rowIndex > 0) && (columnIndex > 0)) {
            var min = Math.min(
                state.distanceCostMatrix[rowIndex - 1][columnIndex],          // Insertion
                state.distanceCostMatrix[rowIndex][columnIndex - 1],          // Deletion
                state.distanceCostMatrix[rowIndex - 1][columnIndex - 1]);     // Match
            if (this.nearlyEqual(min, state.distanceCostMatrix[rowIndex - 1][columnIndex - 1], epsilon)) {
                rowIndex--;
                columnIndex--;
            } else if (this.nearlyEqual(min, state.distanceCostMatrix[rowIndex - 1][columnIndex], epsilon)) {
                rowIndex--;
            } else if (this.nearlyEqual(min, state.distanceCostMatrix[rowIndex][columnIndex - 1], epsilon)) {
                columnIndex--;
            }
        } else if ((rowIndex > 0) && (columnIndex === 0)) {
            rowIndex--;
        } else if ((rowIndex === 0) && (columnIndex > 0)) {
            columnIndex--;
        }

        path.push([rowIndex, columnIndex]);
    }

    var end = new Date().getTime();
    var time = end - start;
    return path.reverse();
};

DTW.prototype.validateSequence = function (sequence, sequenceParameterName) {
    if (!(sequence instanceof Array)) {
        throw new TypeError('Invalid sequence \'' + sequenceParameterName + '\' type: expected an array');
    }

    if (sequence.length < 1) {
        throw new Error('Invalid number of sequence data points for \'' + sequenceParameterName + '\': expected at least one');
    }

    if (typeof sequence[0] !== 'number') {
        throw new TypeError('Invalid data points types for sequence \'' + sequenceParameterName + '\': expected a number');
    }
};

DTW.prototype.createArray = function (length, value) {
    if (typeof length !== 'number') {
        throw new TypeError('Invalid length type');
    }

    if (typeof value === 'undefined') {
        throw new Error('Invalid value: expected a value to be provided');
    }

    var array = new Array(length);
    for (var index = 0; index < length; index++) {
        array[index] = value;
    }

    return array;
};

DTW.prototype.createMatrix = function (m, n, value) {
    var matrix = [];
    for (var rowIndex = 0; rowIndex < m; rowIndex++) {
        matrix.push(this.createArray(n, value));
    }

    return matrix;
};

DTW.prototype.nearlyEqual = function (i, j, epsilon) {
    var iAbsolute= Math.abs(i);
    var jAbsolute = Math.abs(j);
    var difference = Math.abs(i - j);
    var equal = i === j;
    if (!equal) {
        equal = difference < EPSILON;
        if (!equal) {
            equal = difference <= Math.max(iAbsolute, jAbsolute) * epsilon;
        }
    }

    return equal;
};

DTW.prototype.euclideanDistance = function (x, y) {
    var difference = x - y;
    var euclideanDistance = Math.sqrt(difference * difference);
    return euclideanDistance;
};

DTW.prototype.manhattanDistance = function (x, y) {
    var difference = x - y;
    var manhattanDistance = Math.abs(difference);
    return manhattanDistance;
};

DTW.prototype.squaredEuclideanDistance = function (x, y) {
    var difference = x - y;
    var squaredEuclideanDistance = difference * difference;
    return squaredEuclideanDistance;
};

