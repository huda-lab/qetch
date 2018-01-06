/* Point definition
 * The x and the y are the values to consider to do the matches, they has been scaled for
 * the current aspect ratio
 * The origX and origY are the real values.
 * For example, if the dataset has values from 1M to 2M they will be scaled from 0 to ~1000
 * to match the same resolution of the canvas where the query is drawn.
 */
Qetch.Point = function (x,y, origX, origY) {
  this.x = x;
  this.y = y;
  this.origX = origX;
  this.origY = origY;
  return this;
};
Qetch.Point.prototype.copy = function () {
  return new Qetch.Point(
    this.x,
    this.y,
    this.origX,
    this.origY
  );
};
Qetch.Point.prototype.translateXCopy = function (offsetX, offsetOrigX) {
  return new Qetch.Point(
    this.x + offsetX,
    this.y,
    this.origX + offsetOrigX,
    this.origY
  );
};
Qetch.Point.prototype.toString = function () {
  return '(' + this.x + ',' + this.y + ')';
};

Qetch.Tangent = function (point, tangent) {
  this.point = point;
  this.tangent = tangent;
  return this;
};
Qetch.Tangent.prototype.copy = function () {
  return new Qetch.Tangent(
    this.point.copy(),
    this.tangent
  );
};

Qetch.Section = function (sign) {
  this.points = []; // the array of points of that sections,
  this.tangents = []; // the array of the tangents contained in the section
  this.sign = sign; // the sign of the section 1, -1 or 0
  this.next = []; // array of sections that come after (in case of repetitions the next could be a previous one)
  return this;
};

/* add all the points of a section in the current section */
Qetch.Section.prototype.concat = function (section) {
  for (var i = 0; i < section.points.length; i++) {
    this.points.push(section.points[i]);
    this.tangents.push(section.tangents[i]);
  }
};

/** section copy, but where the tangents are not copied, and the next array is set to null **/
Qetch.Section.prototype.translateXCopy = function (offsetX, offsetOrigX) {
  var ns = new Qetch.Section(this.sign);
  ns.tangents = this.tangents;
  ns.next = null;
  ns.id = this.id;
  for (var i = 0; i < this.points.length; i++) {
    ns.points.push(this.points[i].translateXCopy(offsetX, offsetOrigX));
  }
  return ns;
};

/** section copy, but where the tangents are not copied, and the next array is set to null **/
Qetch.Section.prototype.copy = function () {
  var ns = new Qetch.Section(this.sign);
  ns.tangents = this.tangents;
  ns.next = null;
  ns.id = this.id;
  for (var i = 0; i < this.points.length; i++) {
    ns.points.push(this.points[i].copy());
  }
  return ns;
};

Qetch.Section.prototype.size = function () {
  return _.last(this.points).x - this.points[0].x;
};

Qetch.Section.prototype.sizeEucl = function () {
  return Math.sqrt(Math.pow(_.last(this.points).x - this.points[0].x, 2) + Math.pow(_.last(this.points).y - this.points[0].y, 2));
};

function shuffle(array) {
  var counter = array.length;

  // While there are elements in the array
  while (counter > 0) {
    // Pick a random index
    var index = Math.floor(Math.random() * counter);

    // Decrease counter by 1
    counter--;

    // And swap the last element with it
    var temp = array[counter];
    array[counter] = array[index];
    array[index] = temp;
  }

  return array;
}