// Copied from reselect performance test suite
// https://github.com/reduxjs/reselect/blob/master/test/test_selector.js
const numOfStates = 1000000
const states = []
for (let i = 0; i < numOfStates; i++) {
  states.push({ a: 1, b: 2 })
}

const { createSelector } = require('reselect')
const { makeSelector } = require('./lib')
const {
  makeSelector: makeSelectorES6,
  createSelectionContext,
} = require('./lib-es6')

const context = createSelectionContext()
let depth = 0
context.setComputationWrapper(compute => {
  depth = depth + 1
  try {
    return compute()
  } finally {
    depth = depth - 1
  }
})
context.setInvocationWrapper(invoke => {
  depth = depth + 1
  try {
    return invoke()
  } finally {
    depth = depth - 1
  }
})

suite('Cache hit', () => {
  const reSelector = createSelector(
    state => state.a,
    state => state.b,
    (a, b) => a + b
  )
  const logic = query => query(state => state.a) + query(state => state.b)
  const rereSelector = makeSelector(logic)
  const rereSelectorES6 = makeSelectorES6(logic)
  const rereSelectorWithWrapper = context.makeSelector(logic)
  bench('reselect', () => reSelector(states[0]))
  bench('rereselect', () => rereSelector(states[0]))
  bench('rereselect es6', () => rereSelectorES6(states[0]))
  bench('rereselect w/ wrapper', () => rereSelectorWithWrapper(states[0]))
})

suite('Cache hit but shallowly equal selector args', () => {
  const reSelector = createSelector(
    state => state.a,
    state => state.b,
    (a, b) => a + b
  )
  const selectA = state => state.a
  const selectB = state => state.b
  const logic = query => query(selectA) + query(selectB)
  const rereSelector = makeSelector(logic)
  const rereSelectorES6 = makeSelectorES6(logic)
  const rereSelectorWithWrapper = context.makeSelector(logic)
  let i = 0
  let j = 0
  let k = 0
  let l = 0
  bench('reselect', () => {
    reSelector(states[i++ % numOfStates])
  })
  bench('rereselect', () => {
    rereSelector(states[j++ % numOfStates])
  })
  bench('rereselect es6', () => {
    rereSelectorES6(states[k++ % numOfStates])
  })
  bench('rereselect w/ wrapper', () => {
    rereSelectorWithWrapper(states[l++ % numOfStates])
  })
})

suite('Cache miss', () => {
  const reSelector = createSelector(
    state => state.a,
    state => state.b,
    state => state.c,
    (a, b, c) => a + b * c
  )
  const selectA = state => state.a
  const selectB = state => state.b
  const selectC = state => state.c
  const logic = query => query(selectA) + query(selectB) * query(selectC)
  const rereSelector = makeSelector(logic)
  const rereSelectorES6 = makeSelectorES6(logic)
  const rereSelectorWithWrapper = context.makeSelector(logic)
  let i = 0
  let j = 0
  let k = 0
  let l = 0
  bench('reselect', () => {
    reSelector({ a: i++, b: i++, c: i++ })
  })
  bench('rereselect', () => {
    rereSelector({ a: j++, b: j++, c: j++ })
  })
  bench('rereselect es6', () => {
    rereSelectorES6({ a: k++, b: k++, c: k++ })
  })
  bench('rereselect w/ wrapper', () => {
    rereSelectorWithWrapper({ a: l++, b: l++, c: l++ })
  })
})
