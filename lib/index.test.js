"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("./index");
test('basic selector', function () {
    var context = index_1.createSelectionContext();
    var selector = context.makeSelector(function (query) { return query(function (state) { return state.a; }); });
    var firstState = { a: 1 };
    var firstStateNewPointer = { a: 1 };
    var secondState = { a: 2 };
    expect(selector(firstState)).toEqual(1);
    expect(selector(firstState)).toEqual(1);
    expect(selector.recomputations()).toEqual(1);
    expect(selector(firstStateNewPointer)).toEqual(1);
    expect(selector.recomputations()).toEqual(1);
    expect(selector(secondState)).toEqual(2);
    expect(selector.recomputations()).toEqual(2);
});
test('basic selector multiple keys', function () {
    var context = index_1.createSelectionContext();
    var selector = context.makeSelector(function (query) { return query(function (state) { return state.a; }) + query(function (state) { return state.b; }); });
    var state1 = { a: 1, b: 2 };
    expect(selector(state1)).toEqual(3);
    expect(selector(state1)).toEqual(3);
    expect(selector.recomputations()).toEqual(1);
    var state2 = { a: 3, b: 2 };
    expect(selector(state2)).toEqual(5);
    expect(selector(state2)).toEqual(5);
    expect(selector.recomputations()).toEqual(2);
});
//# sourceMappingURL=index.test.js.map