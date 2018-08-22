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
test('introspecting', function () {
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
    var makeNamedSelector = function (name, logic) {
        return Object.assign(context.makeSelector(function (query) {
            return runWithLog("COMPUTE " + name, function () { return logic(query); });
        }), { displayName: name });
    };
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
    context.setWrapper(function (execute, selector) {
        return runWithLog('INVOKE ' + selector.displayName, execute);
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
    expect(log).toMatchInlineSnapshot("\nArray [\n  \"Initial state (no one online)\",\n  \"| INVOKE selectOnlineUsers\",\n  \"| | COMPUTE selectOnlineUsers\",\n  \"| | | INVOKE selectOnlineUserIds\",\n  \"| | | | COMPUTE selectOnlineUserIds\",\n  \"Alice and Eve is online\",\n  \"| INVOKE selectOnlineUsers\",\n  \"| | INVOKE selectOnlineUserIds\",\n  \"| | | COMPUTE selectOnlineUserIds\",\n  \"| | COMPUTE selectOnlineUsers\",\n  \"| | | INVOKE selectOnlineUserIds\",\n  \"| | | INVOKE selectUserById(alice)\",\n  \"| | | | COMPUTE selectUserById(alice)\",\n  \"| | | INVOKE selectUserById(eve)\",\n  \"| | | | COMPUTE selectUserById(eve)\",\n  \"Bob\u2019s info changed\",\n  \"| INVOKE selectOnlineUsers\",\n  \"| | INVOKE selectOnlineUserIds\",\n  \"| | INVOKE selectUserById(alice)\",\n  \"| | INVOKE selectUserById(eve)\",\n  \"Eve is offline, Charlie is online\",\n  \"| INVOKE selectOnlineUsers\",\n  \"| | INVOKE selectOnlineUserIds\",\n  \"| | | COMPUTE selectOnlineUserIds\",\n  \"| | COMPUTE selectOnlineUsers\",\n  \"| | | INVOKE selectOnlineUserIds\",\n  \"| | | INVOKE selectUserById(alice)\",\n  \"| | | INVOKE selectUserById(charlie)\",\n  \"| | | | COMPUTE selectUserById(charlie)\",\n  \"Alice info changed\",\n  \"| INVOKE selectOnlineUsers\",\n  \"| | INVOKE selectOnlineUserIds\",\n  \"| | INVOKE selectUserById(alice)\",\n  \"| | | COMPUTE selectUserById(alice)\",\n  \"| | COMPUTE selectOnlineUsers\",\n  \"| | | INVOKE selectOnlineUserIds\",\n  \"| | | INVOKE selectUserById(alice)\",\n  \"| | | INVOKE selectUserById(charlie)\",\n]\n");
});
//# sourceMappingURL=index.test.js.map