"use strict";
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Selects the state.
 */
exports.selectState = function (state) { return state; };
/**
 * Creates a new context for selection. Useful if you want a statically-typed
 * `makeSelector` function.
 */
function createSelectionContext() {
    var latestSelection;
    var wrapper;
    function makeSelector(selectionLogic) {
        var recomputations = 0;
        var cachedResult;
        function select(state) {
            var e_1, _a;
            if (!latestSelection) {
                latestSelection = { state: state, version: 1 };
            }
            if (latestSelection.state !== state) {
                latestSelection.state = state;
                latestSelection.version += 1;
            }
            var currentStateVersion = latestSelection.version;
            if (cachedResult) {
                if (currentStateVersion === cachedResult.stateVersion) {
                    return cachedResult.value;
                }
                if (!cachedResult.dependencies) {
                    return cachedResult.value;
                }
                var changed = false;
                try {
                    for (var _b = __values(cachedResult.dependencies.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var _d = __read(_c.value, 2), selector = _d[0], value = _d[1];
                        if (selector(state) !== value) {
                            changed = true;
                            break;
                        }
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                if (!changed) {
                    return cachedResult.value;
                }
            }
            recomputations += 1;
            var dependencies = new Map();
            var query = function (selector) {
                if (dependencies.has(selector))
                    return dependencies.get(selector);
                var value = selector(state);
                dependencies.set(selector, value);
                return value;
            };
            var resultValue = selectionLogic(query);
            cachedResult = {
                stateVersion: currentStateVersion,
                dependencies: dependencies,
                value: resultValue
            };
            return resultValue;
        }
        var enhancedSelector = Object.assign(function selector(state) {
            if (!wrapper) {
                return select(state);
            }
            return wrapper(function () { return select(state); }, enhancedSelector, state);
        }, {
            selectionLogic: selectionLogic,
            recomputations: function () { return recomputations; },
            resetRecomputations: function () { return (recomputations = 0); },
            introspect: function (state) {
                enhancedSelector(state);
                return cachedResult;
            }
        });
        return enhancedSelector;
    }
    return {
        makeSelector: makeSelector
    };
}
exports.createSelectionContext = createSelectionContext;
var defaultContext = createSelectionContext();
exports.makeSelector = defaultContext.makeSelector;
//# sourceMappingURL=index.js.map