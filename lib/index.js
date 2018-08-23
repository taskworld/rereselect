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
    // To prevent memory leak, we avoid storing reference to the whole state
    // tree inside each selector. Instead, we store the version number of
    // the input.
    var latestSelection;
    // A wrapper may be set to intercept selector invocations and computations
    // (e.g. for debugging, tracing or profiling purposes)
    var invocationWrapper;
    var computationWrapper;
    function makeSelector(selectionLogic) {
        var recomputations = 0;
        /**
         * The result of previous computation
         */
        var cachedResult;
        function select(state) {
            var e_1, _a;
            // Set up initial global state.
            if (!latestSelection) {
                latestSelection = { state: state, version: 1 };
            }
            // Increment state version if state changed.
            if (latestSelection.state !== state) {
                latestSelection.state = state;
                latestSelection.version += 1;
            }
            var currentStateVersion = latestSelection.version;
            /**
             * In the 1st computation, `reason` will be undefined. In subsequent
             * recomputations, `reason` will be the selector which caused the
             * invalidation of cached result.
             */
            var reason;
            if (cachedResult) {
                // Short-circuit: input state tree is the same
                if (currentStateVersion === cachedResult.stateVersion) {
                    return cachedResult.value;
                }
                // Check if dependencies changed
                var changed = false;
                try {
                    for (var _b = __values(cachedResult.dependencies.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                        var _d = __read(_c.value, 2), selector = _d[0], value = _d[1];
                        if (selector(state) !== value) {
                            changed = true;
                            reason = selector;
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
            // At this point, either it’s the 1st computation, or one of the
            // dependencies must have changed its result.
            recomputations += 1;
            var dependencies = new Map();
            var query = Object.assign(function (selector) {
                if (dependencies.has(selector))
                    return dependencies.get(selector);
                var value = selector(state);
                dependencies.set(selector, value);
                return value;
            }, { reason: reason });
            var resultValue = computationWrapper
                ? computationWrapper(function () { return selectionLogic(query); }, enhancedSelector, state, reason)
                : selectionLogic(query);
            // Require that a selection logic must make at least one call to `query`.
            if (dependencies.size === 0) {
                throw new Error('[rereselect] Selector malfunction: ' +
                    'The selection logic must select some data by calling `query(selector)` at least once.');
            }
            // Memoize the result.
            cachedResult = {
                stateVersion: currentStateVersion,
                dependencies: dependencies,
                value: resultValue,
            };
            return resultValue;
        }
        var enhancedSelector = Object.assign(function selector(state) {
            if (!invocationWrapper) {
                return select(state);
            }
            return invocationWrapper(function () { return select(state); }, enhancedSelector, state);
        }, {
            selectionLogic: selectionLogic,
            recomputations: function () { return recomputations; },
            resetRecomputations: function () { return (recomputations = 0); },
            introspect: function () { return cachedResult; },
        });
        return enhancedSelector;
    }
    return {
        makeSelector: makeSelector,
        setInvocationWrapper: function (fn) {
            invocationWrapper = fn;
        },
        setComputationWrapper: function (fn) {
            computationWrapper = fn;
        },
    };
}
exports.createSelectionContext = createSelectionContext;
var defaultContext = createSelectionContext();
/**
 * makeSelector creates a selector based on given selectionLogic.
 *
 * @param selectionLogic - The selection logic. It will be passed a
 * function `query` which you can call to invoke other selectors.
 * By doing so, the dependencies between selectors will be tracked
 * automatically.
 */
exports.makeSelector = defaultContext.makeSelector;
//# sourceMappingURL=index.js.map