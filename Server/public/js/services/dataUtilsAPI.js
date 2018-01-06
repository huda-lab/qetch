var Dataset = angular.module('Dataset');

Dataset.service('Data_Utils', ['$rootScope', 'Parameters', function($rootScope, Parameters) {

  this.tangent = function (p1, p2, flipY) {
    return (flipY ? (p1.y - p2.y) : (p2.y - p1.y)) / (p2.x - p1.x);
  };

  this.countSignVariations = function (data) {
    if (data.length < 2) return 0;

    var i, variations = 0;
    var lastTgSign = math.sign(this.tangent(data[0], data[1]));
    for (i = 1; i < data.length; i++) {
      var currTgSign = math.sign(this.tangent(data[i-1], data[i]));
      if (lastTgSign != currTgSign && currTgSign !== 0) variations++;
      lastTgSign = currTgSign;
    }

    return variations;
  };

  /* It smooths the data considering different itarations
   * @param dataArray is an array where dataArray[0] contains the data itself, and the next positions will contain the
   *                  smoothed data
   */
  this.smoothData = function (dataArray, minimumSignVarations, variationRatio,
                              minSectRelHeightMaxRatio, smoothedHeightHeightMinRatio) {
    //To decide during the smooth, considering the number of sections and number of points
    var lastDataPos = dataArray.length - 1;
    var currentSignVariationNum, lastSignVariationNum = this.countSignVariations(dataArray[lastDataPos]);
    // console.log('lastSignVariationNum ' + lastSignVariationNum);
    var attempts = 0;
    var origDataHeight = this.dataHeight(dataArray[0]);

    while (lastSignVariationNum > minimumSignVarations && attempts < Parameters.SMOOTH_MAXIMUM_ATTEMPTS && 
      (!minSectRelHeightMaxRatio || this.getMinSecRelHeight(dataArray[lastDataPos]) <= minSectRelHeightMaxRatio) && 
      (!smoothedHeightHeightMinRatio || this.dataHeight(dataArray[lastDataPos]) / origDataHeight >= smoothedHeightHeightMinRatio)) {

      lastDataPos = dataArray.length - 1;

      // creating a new dataset copy to put the new smoothed data
      dataArray[lastDataPos + 1] = [];
      for (var i = 0; i < dataArray[lastDataPos].length; i++) {
        dataArray[lastDataPos + 1][i] = dataArray[lastDataPos][i].copy();
      }

      // smoothing process
      var maxSpace = 1, space = 1, smoothed = false;
      while (!smoothed) {
        space = 1;
        for (var siIdx = 1; siIdx < Parameters.SMOOTH_ITERATIONS_STEPS; siIdx++) {
          this.smooth(dataArray[lastDataPos + 1], math.pow(2, siIdx), space);
          currentSignVariationNum = this.countSignVariations(dataArray[lastDataPos + 1]);
          if (currentSignVariationNum < minimumSignVarations ||
            currentSignVariationNum / lastSignVariationNum < variationRatio ||
            (minSectRelHeightMaxRatio && this.getMinSecRelHeight(dataArray[lastDataPos + 1]) > minSectRelHeightMaxRatio) ||
            (smoothedHeightHeightMinRatio && this.dataHeight(dataArray[lastDataPos + 1]) / origDataHeight < smoothedHeightHeightMinRatio)) {
            smoothed = true;
            break;
          }
          space = math.min(space + 1, maxSpace);
        }
        maxSpace++;
      }

      lastSignVariationNum = currentSignVariationNum;
      attempts++;
    }

  };

  this.getMinSecRelHeight = function (data) {
    if (data.length < 2) return 1;
    var smallestSectionHeight = Number.MAX_SAFE_INTEGER;
    var greatestSectionHeight = Number.MIN_SAFE_INTEGER;
    var localMaxY = data[0].y, localMinY = data[0].y;
    var lastTgSign = math.sign(this.tangent(data[0], data[1]));
    for (var i = 1; i < data.length; i++) {
      var currTgSign = math.sign(this.tangent(data[i-1], data[i]));
      localMaxY = data[i].x;
      if (lastTgSign != currTgSign && currTgSign !== 0 && localMaxY - localMinY > 0) {
        if (localMaxY - localMinY < smallestSectionHeight) smallestSectionHeight = localMaxY - localMinY;
        if (localMaxY - localMinY > greatestSectionHeight) greatestSectionHeight = localMaxY - localMinY;
        localMinY = localMaxY;
      }
      lastTgSign = currTgSign;
    }
    return smallestSectionHeight / greatestSectionHeight;
  };

  // Moving average (we iterate it multiple times) (no array copies)
  this.smooth = function (data, iterations, space) {
    var i, it;
    for (it = 0; it < iterations; it++) {
      for (i = 1; i < data.length - 1; i++) {
        var count = 1;
        var valuesSum = data[i].y;
        var origValuesSum = data[i].origY;
        for (var s = 1; s <= space ; s++) {
          if (i - s >= 0) {
            valuesSum += data[i - s].y;
            origValuesSum += data[i - s].origY;
            count += 1;
          }
          if (i + s < data.length) {
            valuesSum += data[i + s].y;
            origValuesSum += data[i + s].origY;
            count += 1;
          }
        }
        data[i].y = valuesSum / count;
        data[i].origY = origValuesSum / count;
      }
    }
  };

  this.dataHeight = function (data) {
    var miny = data[0].y, maxy = data[0].y;
    for (var i = 1; i < data.length - 1; i++) {
      if (miny > data[i].y) miny = data[i].y;
      if (maxy < data[i].y) maxy = data[i].y;
    }
    return maxy - miny;
  };

}]);
