"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var index_1 = require("./index");
var lodash_1 = require("lodash");
expect.addSnapshotSerializer({
    test: function (val) {
        return typeof val === 'function' && val.displayName;
    },
    print: function (val) {
        return "[Function " + val.displayName + "]";
    },
});
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
test('tracing hooks (setWrapper)', function () {
    var state = {
        onlineUserIds: [],
        users: {
            alice: { name: 'Alice' },
            bob: { name: 'Bob' },
            charlie: { name: 'Charlie' },
            dave: { name: 'Dave' },
            eve: { name: 'Eve' },
        },
    };
    var context = index_1.createSelectionContext();
    // Logging/tracing utilities.
    var log = [];
    var depth = 0;
    var runWithLog = function (text, f) {
        depth++;
        log.push('| '.repeat(depth) + text);
        try {
            return f();
        }
        finally {
            depth--;
        }
    };
    // At Taskworld we want to be able to profile and debug our selectors.
    // That’s why we require all selectors to have names. Instead of
    // creating selectors using `makeSelector`, we use `makeNamedSelector`
    // instead.
    var makeNamedSelector = function (name, logic) {
        return Object.assign(context.makeSelector(logic), { displayName: name });
    };
    var selectorName = function (selector) {
        return String(selector.displayName || selector.name || '[unnamed selector]')
            .replace(/\s+/g, ' ')
            .trim();
    };
    // Set up wrappers
    context.setInvocationWrapper(function (execute, selector) {
        return runWithLog('INVOKE ' + selectorName(selector), execute);
    });
    context.setComputationWrapper(function (compute, selector, state, reason) {
        var suffix = reason
            ? " [invalidated by " + selectorName(reason) + "]"
            : ' [first run]';
        return runWithLog("COMPUTE " + selectorName(selector) + suffix, compute);
    });
    // Act
    var selectOnlineUserIds = makeNamedSelector('selectOnlineUserIds', function (query) {
        return query(function (state) { return state.onlineUserIds; });
    });
    var selectUserById = lodash_1.memoize(function (id) {
        return makeNamedSelector("selectUserById(" + id + ")", function (query) {
            return query(function (state) { return state.users[id]; });
        });
    });
    var selectOnlineUsers = makeNamedSelector('selectOnlineUsers', function (query) {
        return query(selectOnlineUserIds).map(function (id) { return query(selectUserById(id)); });
    });
    log.push('Initial state (no one online)');
    selectOnlineUsers(state);
    log.push('Alice and Eve is online');
    state = __assign({}, state, { onlineUserIds: ['alice', 'eve'] });
    selectOnlineUsers(state);
    log.push('Bob’s info changed');
    state = __assign({}, state, { users: __assign({}, state.users, { bob: { name: 'Bobby Tables' } }) });
    selectOnlineUsers(state);
    log.push('Eve is offline, Charlie is online');
    state = __assign({}, state, { onlineUserIds: ['alice', 'charlie'] });
    selectOnlineUsers(state);
    log.push('Alice info changed');
    state = __assign({}, state, { users: __assign({}, state.users, { alice: { name: 'Alice in wonderland' } }) });
    selectOnlineUsers(state);
    // Assert
    expect(log).toMatchInlineSnapshot("\nArray [\n  \"Initial state (no one online)\",\n  \"| INVOKE selectOnlineUsers\",\n  \"| | COMPUTE selectOnlineUsers [first run]\",\n  \"| | | INVOKE selectOnlineUserIds\",\n  \"| | | | COMPUTE selectOnlineUserIds [first run]\",\n  \"Alice and Eve is online\",\n  \"| INVOKE selectOnlineUsers\",\n  \"| | INVOKE selectOnlineUserIds\",\n  \"| | | COMPUTE selectOnlineUserIds [invalidated by [unnamed selector]]\",\n  \"| | COMPUTE selectOnlineUsers [invalidated by selectOnlineUserIds]\",\n  \"| | | INVOKE selectOnlineUserIds\",\n  \"| | | INVOKE selectUserById(alice)\",\n  \"| | | | COMPUTE selectUserById(alice) [first run]\",\n  \"| | | INVOKE selectUserById(eve)\",\n  \"| | | | COMPUTE selectUserById(eve) [first run]\",\n  \"Bob\u2019s info changed\",\n  \"| INVOKE selectOnlineUsers\",\n  \"| | INVOKE selectOnlineUserIds\",\n  \"| | INVOKE selectUserById(alice)\",\n  \"| | INVOKE selectUserById(eve)\",\n  \"Eve is offline, Charlie is online\",\n  \"| INVOKE selectOnlineUsers\",\n  \"| | INVOKE selectOnlineUserIds\",\n  \"| | | COMPUTE selectOnlineUserIds [invalidated by [unnamed selector]]\",\n  \"| | COMPUTE selectOnlineUsers [invalidated by selectOnlineUserIds]\",\n  \"| | | INVOKE selectOnlineUserIds\",\n  \"| | | INVOKE selectUserById(alice)\",\n  \"| | | INVOKE selectUserById(charlie)\",\n  \"| | | | COMPUTE selectUserById(charlie) [first run]\",\n  \"Alice info changed\",\n  \"| INVOKE selectOnlineUsers\",\n  \"| | INVOKE selectOnlineUserIds\",\n  \"| | INVOKE selectUserById(alice)\",\n  \"| | | COMPUTE selectUserById(alice) [invalidated by [unnamed selector]]\",\n  \"| | COMPUTE selectOnlineUsers [invalidated by selectUserById(alice)]\",\n  \"| | | INVOKE selectOnlineUserIds\",\n  \"| | | INVOKE selectUserById(alice)\",\n  \"| | | INVOKE selectUserById(charlie)\",\n]\n");
});
test('resetting computation count', function () {
    var context = index_1.createSelectionContext();
    var selector = context.makeSelector(function (query) { return query(function (state) { return state.a; }); });
    expect(selector({ a: 2 })).toEqual(2);
    expect(selector.recomputations()).toEqual(1);
    selector.resetRecomputations();
    expect(selector.recomputations()).toEqual(0);
    expect(selector({ a: 3 })).toEqual(3);
    expect(selector.recomputations()).toEqual(1);
});
test('introspection api', function () {
    var context = index_1.createSelectionContext();
    var selectA = function (state) { return state.a; };
    Object.assign(selectA, { displayName: 'selectA' });
    var selectB = function (state) { return state.b; };
    Object.assign(selectB, { displayName: 'selectB' });
    var selector = context.makeSelector(function (query) {
        return query(selectA) + query(selectB) * query(selectA);
    });
    Object.assign(selector, { displayName: 'selector' });
    expect(selector({ a: 2, b: 3 })).toEqual(8);
    expect(selector.introspect()).toMatchInlineSnapshot("\nObject {\n  \"dependencies\": Map {\n    [Function selectA] => 2,\n    [Function selectB] => 3,\n  },\n  \"stateVersion\": 1,\n  \"value\": 8,\n}\n");
});
//# sourceMappingURL=index.test.js.map