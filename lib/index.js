"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeSelector = exports.selectState = void 0;
exports.createSelectionContext = createSelectionContext;
/**
 * Selects the state.
 */
const selectState = state => state;
exports.selectState = selectState;
/**
 * Creates a new context for selection. Useful if you want a statically-typed
 * `makeSelector` function.
 */
function createSelectionContext() {
    // To prevent memory leak, we avoid storing reference to the whole state
    // tree inside each selector. Instead, we store the version number of
    // the input.
    let latestSelection;
    // A wrapper may be set to intercept selector invocations and computations
    // (e.g. for debugging, tracing or profiling purposes)
    let invocationWrapper;
    let computationWrapper;
    function makeSelector(selectionLogic) {
        let recomputations = 0;
        /**
         * The result of previous computation
         */
        let cachedResult;
        function select(state) {
            // Set up initial global state.
            if (!latestSelection) {
                latestSelection = { state: state, version: 1 };
            }
            // Increment state version if state changed.
            if (latestSelection.state !== state) {
                latestSelection.state = state;
                latestSelection.version += 1;
            }
            const currentStateVersion = latestSelection.version;
            /**
             * In the 1st computation, `reason` will be undefined. In subsequent
             * recomputations, `reason` will be the selector which caused the
             * invalidation of cached result.
             */
            let reason;
            if (cachedResult) {
                // Short-circuit: input state tree is the same
                if (currentStateVersion === cachedResult.stateVersion) {
                    return cachedResult.value;
                }
                // Check if dependencies changed
                let changed = false;
                for (const [selector, value] of cachedResult.dependencies.entries()) {
                    if (selector(state) !== value) {
                        changed = true;
                        reason = selector;
                        break;
                    }
                }
                if (!changed) {
                    return cachedResult.value;
                }
            }
            // At this point, either it’s the 1st computation, or one of the
            // dependencies must have changed its result.
            recomputations += 1;
            const dependencies = new Map();
            const query = Object.assign((selector) => {
                if (dependencies.has(selector))
                    return dependencies.get(selector);
                const value = selector(state);
                dependencies.set(selector, value);
                return value;
            }, { reason });
            const resultValue = computationWrapper
                ? computationWrapper(() => selectionLogic(query), enhancedSelector, state, reason)
                : selectionLogic(query);
            // Require that a selection logic must make at least one call to `query`.
            if (dependencies.size === 0) {
                throw new Error('[rereselect] Selector malfunction: ' +
                    'The selection logic must select some data by calling `query(selector)` at least once.');
            }
            // Memoize the result.
            cachedResult = {
                stateVersion: currentStateVersion,
                dependencies,
                value: resultValue,
            };
            return resultValue;
        }
        const enhancedSelector = Object.assign(function selector(state) {
            if (!invocationWrapper) {
                return select(state);
            }
            return invocationWrapper(() => select(state), enhancedSelector, state);
        }, {
            selectionLogic: selectionLogic,
            recomputations: () => recomputations,
            resetRecomputations: () => (recomputations = 0),
            introspect: () => cachedResult,
        });
        return enhancedSelector;
    }
    return {
        makeSelector,
        setInvocationWrapper: fn => {
            invocationWrapper = fn;
        },
        setComputationWrapper: fn => {
            computationWrapper = fn;
        },
    };
}
const defaultContext = createSelectionContext();
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