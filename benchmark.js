// Copied from reselect performance test suite
// https://github.com/reduxjs/reselect/blob/master/test/test_selector.js
const numOfStates = 1000000
const states = []
for (let i = 0; i < numOfStates; i++) {
  states.push({ a: 1, b: 2 })
}

const { createSelector } = require('reselect')
const { makeSelector } = require('./lib')
const { makeSelector: makeSelectorES6 } = require('./lib-es6')

suite('Cache hit', () => {
  const reSelector = createSelector(
    state => state.a,
    state => state.b,
    (a, b) => a + b
  )
  const rereSelector = makeSelector(
    query => query(state => state.a) + query(state => state.b)
  )
  const rereSelectorES6 = makeSelectorES6(
    query => query(state => state.a) + query(state => state.b)
  )
  bench('reselect', () => reSelector(states[0]))
  bench('rereselect', () => rereSelector(states[0]))
  bench('rereselect es6', () => rereSelectorES6(states[0]))
})

suite('Cache hit but shallowly equal selector args', () => {
  const reSelector = createSelector(
    state => state.a,
    state => state.b,
    (a, b) => a + b
  )
  const selectA = state => state.a
  const selectB = state => state.b
  const rereSelector = makeSelector(query => query(selectA) + query(selectB))
  const rereSelectorES6 = makeSelectorES6(
    query => query(selectA) + query(selectB)
  )
  let i = 0
  let j = 0
  let k = 0
  bench('reselect', () => reSelector(states[i++ % numOfStates]))
  bench('rereselect', () => rereSelector(states[j++ % numOfStates]))
  bench('rereselect es6', () => rereSelectorES6(states[k++ % numOfStates]))
})

suite('Cache miss', () => {
  const reSelector = createSelector(
    state => state.a,
    state => state.b,
    (a, b) => a + b
  )
  const selectA = state => state.a
  const selectB = state => state.b
  const rereSelector = makeSelector(query => query(selectA) + query(selectB))
  const rereSelectorES6 = makeSelectorES6(
    query => query(selectA) + query(selectB)
  )
  let i = 0
  let j = 0
  let k = 0
  bench('reselect', () => reSelector({ a: i++, b: i++ }))
  bench('rereselect', () => rereSelector({ a: j++, b: j++ }))
  bench('rereselect es6', () => rereSelectorES6({ a: k++, b: k++ }))
})
