// Modified from https://github.com/reduxjs/reselect/blob/v3.0.1/test/test_selector.js

import { describe, bench } from 'vitest'
import { createSelector as createSelector3 } from 'reselect3'
import { createSelector as createSelector5 } from 'reselect5'
import { makeSelector, createSelectionContext } from '../lib'

const numOfStates = 1000000
const states: any[] = []
for (let i = 0; i < numOfStates; i++) {
  states.push({ a: 1, b: 2 })
}

const selectA = (state: any): number => state.a
const selectB = (state: any): number => state.b
const selectC = (state: any): number => state.c

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

describe('cache hit', () => {
  {
    const select = createSelector3(
      selectA,
      selectB,
      (a, b) => a + b
    )
    bench('reselect v3', () => {
      select(states[0])
    })
  }

  {
    const select = createSelector5(
      [selectA, selectB],
      (a, b) => a + b
    )
    bench('reselect v5', () => {
      select(states[0])
    })
  }

  const logic = query => query(state => state.a) + query(state => state.b)
  {
    const select = makeSelector(logic)
    bench('rereselect', () => {
      select(states[0])
    })
  }
  {
    const select = context.makeSelector(logic)
    bench('rereselect w/ wrapper', () => {
      select(states[0])
    })
  }
})

describe('cache hit but shallowly equal selector args', () => {
  {
    const select = createSelector3(
      selectA,
      selectB,
      (a, b) => a + b
    )
    let i = 0
    bench('reselect v3', () => {
      select(states[i++ % numOfStates])
    })
  }

  {
    const select = createSelector5(
      [selectA, selectB],
      (a, b) => a + b
    )
    let i = 0
    bench('reselect v5', () => {
      select(states[i++ % numOfStates])
    })
  }

  const logic = query => query(selectA) + query(selectB)
  {
    const select = makeSelector(logic)
    let i = 0
    bench('rereselect', () => {
      select(states[i++ % numOfStates])
    })
  }
  {
    const select = context.makeSelector(logic)
    let i = 0
    bench('rereselect w/ wrapper', () => {
      select(states[i++ % numOfStates])
    })
  }
})

describe('cache miss', () => {
  {
    const select = createSelector3(
      selectA,
      selectB,
      (state: any) => state.c,
      (a, b, c) => a + b * c
    )
    let i = 0
    bench('reselect v3', () => {
      select({ a: i++, b: i++, c: i++ })
    })
  }

  {
    const select = createSelector5(
      [selectA, selectB, selectC],
      (a, b, c) => a + b * c
    )
    let i = 0
    bench('reselect v5', () => {
      select({ a: i++, b: i++, c: i++ })
    })
  }

  const logic = query => query(selectA) + query(selectB) * query(selectC)
  {
    const select = makeSelector(logic)
    let i = 0
    bench('rereselect', () => {
      select({ a: i++, b: i++, c: i++ })
    })
  }
  {
    const select = context.makeSelector(logic)
    let i = 0
    bench('rereselect w/ wrapper', () => {
      select({ a: i++, b: i++, c: i++ })
    })
  }
})
