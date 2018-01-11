function typeOf(obj) {
    return Object.prototype.toString.call(obj).replace(/\[object ([A-Z][a-z]+)\]/, "$1");
}

["String", "Object", "Array", "Undefined"].forEach(function(type) {
    exports["is" + type] = function(obj) {
        return typeOf(obj) == type;
    };
});

function extend(target, sources, safe) {
    sources.forEach(function(source) {
        exports.forEach(source, function(value, key) {
            if (!safe || target[key] === void 0) {
                target[key] = value;
            }
        });
    });

    return target;
}

exports.defaults = function(target) {
    return extend(target, [].slice.call(arguments, 1), true);
};

exports.extend = function(target) {
    return extend(target, [].slice.call(arguments, 1), false);
};

exports.forEach = function(obj, iterator) {
    if (exports.isArray(obj)) {
        obj.forEach(iterator);

        return;
    }

    if (exports.isObject(obj)) {
        Object.keys(obj).forEach(function(key) {
            iterator.call(null, obj[key], key, obj);
        });

        return;
    }
};

exports.isEmpty = function(obj) {
    if (obj == null) return true;
    if (exports.isArray(obj) || exports.isString(obj)) return obj.length === 0;
    return Object.keys(obj).length === 0;
};

exports.contains = function(list, value) {
    return list.indexOf(value) != -1;
};

var keys = {};
var counter = 0;
exports.uniqueId = function(key) {
    if (exports.isString(key)) {
        if (exports.isUndefined(keys[key])) {
            keys[key] = 0;
        }
        return ++keys[key];
    }

    return ++counter;
};
