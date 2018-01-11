var inherits = require("../src/inherits"),
    assert   = require("chai").assert,
    _        = require("lodash");

describe("Suite", function() {

    describe("#inherits", function() {
        it("should create proper nested objects", function() {
            var MyClass = function() {},
                Child = inherits(MyClass);

            assert.isTrue((new Child) instanceof MyClass);
        });

        it("should nest static properties", function() {
            var MyClass = function() {},
                Child;

            MyClass.STATIC = 1;

            Child = inherits(MyClass);

            assert.strictEqual(Child.STATIC, MyClass.STATIC);
        });

        it("should nest proto properties", function() {
            var MyClass = function() {},
                Child;

            MyClass.prototype = {
                a: 1
            };

            Child = inherits(MyClass);

            assert.strictEqual(Child.prototype.a, MyClass.prototype.a);
        });

    });

});