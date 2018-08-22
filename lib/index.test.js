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
test('malfunction selector throws', function () {
    var selector = index_1.makeSelector(function (query) { return 42; });
    var state = { whatever: 'goes' };
    expect(function () { return selector(state); }).toThrow(/query/);
});
test('query does not track duplicate dependencies and remembers results', function () {
    var context = index_1.createSelectionContext();
    var countA = 0;
    var countB = 0;
    var selectA = function (state) { return (countA++, state.a); };
    var selectB = function (state) { return (countB++, state.b); };
    var selector = context.makeSelector(function (query) {
        return query(selectA) + query(selectB) * query(selectA);
    });
    expect(selector({ a: 2, b: 3 })).toEqual(8);
    expect(countA).toEqual(1);
    expect(countB).toEqual(1);
});
//# sourceMappingURL=index.test.js.map