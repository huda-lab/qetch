var extend = require("./utils/extend");

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
    extend(Child.prototype, protoProps);

    // set constructor directly
    // @see https://developer.mozilla.org/en-US/docs/ECMAScript_DontEnum_attribute#JScript_DontEnum_Bug
    Child.prototype.constructor = Child;


    return Child;
};