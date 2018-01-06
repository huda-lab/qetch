/**
 * Each iterator.
 *
 * @param {object}   obj
 * @param {function} func
 * @param {object}  [context]
 *
 * @returns {*}
 */
module.exports = function(obj, func, context) {
    var result;

    context || (context = null);

    for (var x in obj) {
        if (obj.hasOwnProperty(x)) {
            result = func.call(context, obj[x], x, obj);

            if (result !== undefined) {
                return result;
            }
        }
    }

    return result;
};