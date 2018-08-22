"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
test('basic selector', () => {
    const context = index_1.createSelectionContext();
    const selector = context.makeSelector(query => query(state => state.a));
    const firstState = { a: 1 };
    const firstStateNewPointer = { a: 1 };
    const secondState = { a: 2 };
    expect(selector(firstState)).toEqual(1);
    expect(selector(firstState)).toEqual(1);
    expect(selector.recomputations()).toEqual(1);
    expect(selector(firstStateNewPointer)).toEqual(1);
    expect(selector.recomputations()).toEqual(1);
    expect(selector(secondState)).toEqual(2);
    expect(selector.recomputations()).toEqual(2);
});
test('basic selector multiple keys', () => {
    const context = index_1.createSelectionContext();
    const selector = context.makeSelector(query => query(state => state.a) + query(state => state.b));
    const state1 = { a: 1, b: 2 };
    expect(selector(state1)).toEqual(3);
    expect(selector(state1)).toEqual(3);
    expect(selector.recomputations()).toEqual(1);
    const state2 = { a: 3, b: 2 };
    expect(selector(state2)).toEqual(5);
    expect(selector(state2)).toEqual(5);
    expect(selector.recomputations()).toEqual(2);
});
test('malfunction selector throws', () => {
    const selector = index_1.makeSelector(query => 42);
    const state = { whatever: 'goes' };
    expect(() => selector(state)).toThrow(/query/);
});
test('query does not track duplicate dependencies and remembers results', () => {
    const context = index_1.createSelectionContext();
    let countA = 0;
    let countB = 0;
    const selectA = (state) => (countA++, state.a);
    const selectB = (state) => (countB++, state.b);
    const selector = context.makeSelector(query => {
        return query(selectA) + query(selectB) * query(selectA);
    });
    expect(selector({ a: 2, b: 3 })).toEqual(8);
    expect(countA).toEqual(1);
    expect(countB).toEqual(1);
});
//# sourceMappingURL=index.test.js.map