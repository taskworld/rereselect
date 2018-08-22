import { createSelectionContext } from './index'

test('basic selector', () => {
  const context = createSelectionContext<{ a: number }>()
  const selector = context.makeSelector(query => query(state => state.a))
  const firstState = { a: 1 }
  const firstStateNewPointer = { a: 1 }
  const secondState = { a: 2 }

  expect(selector(firstState)).toEqual(1)
  expect(selector(firstState)).toEqual(1)
  expect(selector.recomputations()).toEqual(1)
  expect(selector(firstStateNewPointer)).toEqual(1)
  expect(selector.recomputations()).toEqual(1)
  expect(selector(secondState)).toEqual(2)
  expect(selector.recomputations()).toEqual(2)
})

test('basic selector multiple keys', () => {
  const context = createSelectionContext<{ a: number; b: number }>()
  const selector = context.makeSelector(
    query => query(state => state.a) + query(state => state.b)
  )

  const state1 = { a: 1, b: 2 }
  expect(selector(state1)).toEqual(3)
  expect(selector(state1)).toEqual(3)
  expect(selector.recomputations()).toEqual(1)
  const state2 = { a: 3, b: 2 }
  expect(selector(state2)).toEqual(5)
  expect(selector(state2)).toEqual(5)
  expect(selector.recomputations()).toEqual(2)
})
