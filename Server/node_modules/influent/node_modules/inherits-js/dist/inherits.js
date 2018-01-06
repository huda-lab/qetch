/**
 * inherits-js - Backbone inspired standalone inheritance function.
 *
 * Version: 0.1.0
 * Date: 2014-06-09 15:04:42
 *
 * Copyright 2014, Sergey Kamardin <gobwas@gmail.com>.
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Repository: https://github.com/gobwas/inherits.js.git
 * Location: Moscow, Russia.
 */


(function(global, factory) {

    var isCJS, isAMD;

    isCJS = typeof module === "object"   && module.exports;
    isAMD = typeof define === "function" && define.amd;

    if (isCJS) {
        module.exports = factory();
    } else if (isAMD) {
        define([], function() {
            return factory();
        });
    } else {
        global.inherits = factory();
    }

})(this, function() {

!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var o;"undefined"!=typeof window?o=window:"undefined"!=typeof global?o=global:"undefined"!=typeof self&&(o=self),o.noscope=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var extend = _dereq_("./utils/extend");

module.exports = function(Parent, protoProps, staticProps) {
    var Child;

    protoProps  = protoProps  || {};
    staticProps = staticProps || {};

    if (protoProps.hasOwnProperty("constructor") && typeof protoProps.constructor === 'function') {
        Child = protoProps.constructor;
    } else {
        Child = function() {
            Parent.apply(this, arguments);
        };
    }

    // set the static props to the new Enum
    extend(Child, Parent, staticProps);

    // create prototype of Child, that created with Parent prototype
    // (without making Child.prototype = new Parent())
    //
    // __proto__  <----  __proto__
    //     ^                 ^
    //     |                 |
    //   Parent            Child
    //
    function Surrogate(){}
    Surrogate.prototype = Parent.prototype;
    Child.prototype = new Surrogate();

    // extend prototype
    extend(Child.prototype, protoProps, {
        constructor: Child
    });


    return Child;
};
},{"./utils/extend":3}],2:[function(_dereq_,module,exports){
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
},{}],3:[function(_dereq_,module,exports){
var each = _dereq_("./each");

/**
 * Extends one object by multiple others.
 *
 * @param {object} to
 *
 * @returns {object}
 */
module.exports = function(to) {
    var from = Array.prototype.slice.call(arguments, 1);

    var func = function(value, prop) {
        to[prop] = value;
    };

    for (var x = 0; x < from.length; x++) {
        each(from[x], func);
    }

    return to;
};
},{"./each":2}]},{},[1])
(1)
});

});