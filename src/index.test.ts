import { createSelectionContext, makeSelector, SelectionLogic } from './index'
import { memoize } from 'lodash'

expect.addSnapshotSerializer({
  test(val) {
    return typeof val === 'function' && val.displayName
  },
  print(val) {
    return `[Function ${val.displayName}]`
  },
})

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

test('malfunction selector throws', () => {
  const selector = makeSelector(query => 42)
  const state = { whatever: 'goes' }
  expect(() => selector(state)).toThrow(/query/)
})

test('query does not track duplicate dependencies and remembers results', () => {
  const context = createSelectionContext<{ a: number; b: number }>()
  let countA = 0
  let countB = 0
  const selectA = (state: { a: number }) => (countA++, state.a)
  const selectB = (state: { b: number }) => (countB++, state.b)
  const selector = context.makeSelector(query => {
    return query(selectA) + query(selectB) * query(selectA)
  })
  expect(selector({ a: 2, b: 3 })).toEqual(8)
  expect(countA).toEqual(1)
  expect(countB).toEqual(1)
})

test('tracing hooks (setWrapper)', () => {
  let state = {
    onlineUserIds: [] as string[],
    users: {
      alice: { name: 'Alice' },
      bob: { name: 'Bob' },
      charlie: { name: 'Charlie' },
      dave: { name: 'Dave' },
      eve: { name: 'Eve' },
    } as { [k: string]: { name: string } },
  }

  const context = createSelectionContext<typeof state>()

  // Logging/tracing utilities.
  const log: string[] = []
  let depth = 0
  const runWithLog = <T>(text: string, f: () => T) => {
    depth++
    log.push('| '.repeat(depth) + text)
    try {
      return f()
    } finally {
      depth--
    }
  }

  // At Taskworld we want to be able to profile and debug our selectors.
  // That’s why we require all selectors to have names. Instead of
  // creating selectors using `makeSelector`, we use `makeNamedSelector`
  // instead.
  const makeNamedSelector = <T>(
    name: string,
    logic: SelectionLogic<typeof state, T>
  ) => {
    return Object.assign(context.makeSelector(logic), { displayName: name })
  }
  const selectorName = (selector: any) =>
    String(selector.displayName || selector.name || selector.toString())
      .replace(/\s+/g, ' ')
      .trim()

  // Set up wrappers
  context.setInvocationWrapper((execute, selector) => {
    return runWithLog('INVOKE ' + selectorName(selector), execute)
  })
  context.setComputationWrapper((compute, selector, state, reason) => {
    const suffix = reason
      ? ` [invalidated by ${selectorName(reason)}]`
      : ' [first run]'
    return runWithLog(`COMPUTE ${selectorName(selector)}${suffix}`, compute)
  })

  // Act
  const selectOnlineUserIds = makeNamedSelector('selectOnlineUserIds', query =>
    query(state => state.onlineUserIds)
  )
  const selectUserById = memoize((id: string) =>
    makeNamedSelector(`selectUserById(${id})`, query =>
      query(state => state.users[id])
    )
  )
  const selectOnlineUsers = makeNamedSelector('selectOnlineUsers', query =>
    query(selectOnlineUserIds).map(id => query(selectUserById(id)))
  )

  log.push('Initial state (no one online)')
  selectOnlineUsers(state)

  log.push('Alice and Eve is online')
  state = { ...state, onlineUserIds: ['alice', 'eve'] }
  selectOnlineUsers(state)

  log.push('Bob’s info changed')
  state = {
    ...state,
    users: { ...state.users, bob: { name: 'Bobby Tables' } },
  }
  selectOnlineUsers(state)

  log.push('Eve is offline, Charlie is online')
  state = { ...state, onlineUserIds: ['alice', 'charlie'] }
  selectOnlineUsers(state)

  log.push('Alice info changed')
  state = {
    ...state,
    users: { ...state.users, alice: { name: 'Alice in wonderland' } },
  }
  selectOnlineUsers(state)

  // Assert
  expect(log).toMatchInlineSnapshot(`
Array [
  "Initial state (no one online)",
  "| INVOKE selectOnlineUsers",
  "| | COMPUTE selectOnlineUsers [first run]",
  "| | | INVOKE selectOnlineUserIds",
  "| | | | COMPUTE selectOnlineUserIds [first run]",
  "Alice and Eve is online",
  "| INVOKE selectOnlineUsers",
  "| | INVOKE selectOnlineUserIds",
  "| | | COMPUTE selectOnlineUserIds [invalidated by state => state.onlineUserIds]",
  "| | COMPUTE selectOnlineUsers [invalidated by selectOnlineUserIds]",
  "| | | INVOKE selectOnlineUserIds",
  "| | | INVOKE selectUserById(alice)",
  "| | | | COMPUTE selectUserById(alice) [first run]",
  "| | | INVOKE selectUserById(eve)",
  "| | | | COMPUTE selectUserById(eve) [first run]",
  "Bob’s info changed",
  "| INVOKE selectOnlineUsers",
  "| | INVOKE selectOnlineUserIds",
  "| | INVOKE selectUserById(alice)",
  "| | INVOKE selectUserById(eve)",
  "Eve is offline, Charlie is online",
  "| INVOKE selectOnlineUsers",
  "| | INVOKE selectOnlineUserIds",
  "| | | COMPUTE selectOnlineUserIds [invalidated by state => state.onlineUserIds]",
  "| | COMPUTE selectOnlineUsers [invalidated by selectOnlineUserIds]",
  "| | | INVOKE selectOnlineUserIds",
  "| | | INVOKE selectUserById(alice)",
  "| | | INVOKE selectUserById(charlie)",
  "| | | | COMPUTE selectUserById(charlie) [first run]",
  "Alice info changed",
  "| INVOKE selectOnlineUsers",
  "| | INVOKE selectOnlineUserIds",
  "| | INVOKE selectUserById(alice)",
  "| | | COMPUTE selectUserById(alice) [invalidated by state => state.users[id]]",
  "| | COMPUTE selectOnlineUsers [invalidated by selectUserById(alice)]",
  "| | | INVOKE selectOnlineUserIds",
  "| | | INVOKE selectUserById(alice)",
  "| | | INVOKE selectUserById(charlie)",
]
`)
})

test('resetting computation count', () => {
  const context = createSelectionContext<{ a: number }>()
  const selector = context.makeSelector(query => query(state => state.a))
  expect(selector({ a: 2 })).toEqual(2)
  expect(selector.recomputations()).toEqual(1)
  selector.resetRecomputations()
  expect(selector.recomputations()).toEqual(0)
  expect(selector({ a: 3 })).toEqual(3)
  expect(selector.recomputations()).toEqual(1)
})

test('introspection api', () => {
  const context = createSelectionContext<{ a: number; b: number }>()

  const selectA = (state: { a: number }) => state.a
  Object.assign(selectA, { displayName: 'selectA' })

  const selectB = (state: { b: number }) => state.b
  Object.assign(selectB, { displayName: 'selectB' })

  const selector = context.makeSelector(query => {
    return query(selectA) + query(selectB) * query(selectA)
  })
  Object.assign(selector, { displayName: 'selector' })
  expect(selector({ a: 2, b: 3 })).toEqual(8)
  expect(selector.introspect()).toMatchInlineSnapshot(`
Object {
  "dependencies": Map {
    [Function selectA] => 2,
    [Function selectB] => 3,
  },
  "stateVersion": 1,
  "value": 8,
}
`)
})
