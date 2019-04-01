import $$observable from 'symbol-observable'

import whatToEditTypes from './utils/whatToEditTypes'
import isPlainObject from './utils/isPlainObject'

/**
 * office.........................createStore
 * doc..................................store
 * content..............................state
 * custom............................enhancer
 * whatToEdit.........................reducer
 * howToEdit...........................action
 * edit..............................dispatch
 * print...............................render
 * 
 * content---office--->doc---print--->book
 * howToEdit(whatToEdit(book))---office.edit(content)--->doc---print--->book
 * 
 * 
 * 
 * Creates a Redux doc that holds the state tree.
 * The only way to change the data in the doc is to call `edit()` on it.
 *
 * There should only be a single doc in your app. To specify how different
 * parts of the state tree respond to whatToEdits, you may combine several howToEdits
 * into a single howToEdit function by using `combineHowToEdits`.
 *
 * @param {Function} howToEdit A function that returns the next state tree, given
 * the current state tree and the whatToEdit to handle.
 *
 * @param {any} [preContent] The initial state. You may optionally specify it
 * to hydrate the state from the server in universal apps, or to redoc a
 * previously serialized user session.
 * If you use `combineHowToEdits` to produce the root howToEdit function, this must be
 * an object with the same shape as `combineHowToEdits` keys.
 *
 * @param {Function} [custom] The doc custom. You may optionally specify it
 * to enhance the doc with third-party capabilities such as middleware,
 * time travel, persistence, etc. The only doc custom that ships with Redux
 * is `applyMiddleware()`.
 *
 * @returns {doc} A Redux doc that lets you read the state, edit whatToEdits
 * and subscribe to changes.
 */

 export default function office(howToEdit, preContent, custom) {
  if (
    (typeof preContent === 'function' && typeof custom === 'function') ||
    (typeof custom === 'function' && typeof arguments[3] === 'function')
  ) {
    throw new Error(
      'It looks like you are passing several doc customs to ' +
        'office(). This is not supported. Instead, compose them ' +
        'together to a single function.'
    )
  }

  if (typeof preContent === 'function' && typeof custom === 'undefined') {
    custom = preContent
    preContent = undefined
  }

  if (typeof custom !== 'undefined') {
    if (typeof custom !== 'function') {
      throw new Error('Expected the custom to be a function.')
    }

    return custom(office)(howToEdit, preContent)
  }

  if (typeof howToEdit !== 'function') {
    throw new Error('Expected the howToEdit to be a function.')
  }

  let currentHowToEdit = howToEdit
  let currentContent = preContent
  let currentListeners = []
  let nextListeners = currentListeners
  let isEditing = false

  /**
   * This makes a shallow copy of currentListeners so we can use
   * nextListeners as a temporary list while editing.
   *
   * This prevents any bugs around consumers calling
   * subscribe/unsubscribe in the middle of a edit.
   */
  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice()
    }
  }

  /**
   * Reads the state tree managed by the doc.
   *
   * @returns {any} The current state tree of your application.
   */
  function getContent() {
    if (isEditing) {
      throw new Error(
        'You may not call doc.getContent() while the howToEdit is executing. ' +
          'The howToEdit has already received the state as an argument. ' +
          'Pass it down from the top howToEdit instead of reading it from the doc.'
      )
    }

    return currentContent
  }

  /**
   * Adds a change listener. It will be called any time an whatToEdit is edited,
   * and some part of the state tree may potentially have changed. You may then
   * call `getContent()` to read the current state tree inside the callback.
   *
   * You may call `edit()` from a change listener, with the following
   * caveats:
   *
   * 1. The subscriptions are snapshotted just before every `edit()` call.
   * If you subscribe or unsubscribe while the listeners are being invoked, this
   * will not have any effect on the `edit()` that is currently in progress.
   * However, the next `edit()` call, whether nested or not, will use a more
   * recent snapshot of the subscription list.
   *
   * 2. The listener should not expect to see all state changes, as the state
   * might have been updated multiple times during a nested `edit()` before
   * the listener is called. It is, however, guaranteed that all subscribers
   * registered before the `edit()` started will be called with the latest
   * state by the time it exits.
   *
   * @param {Function} listener A callback to be invoked on every edit.
   * @returns {Function} A function to remove this change listener.
   */
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected the listener to be a function.')
    }

    if (isEditing) {
      throw new Error(
        'You may not call doc.subscribe() while the howToEdit is executing. ' +
          'If you would like to be notified after the doc has been updated, subscribe from a ' +
          'component and invoke doc.getContent() in the callback to access the latest state. ' +
          'See https://redux.js.org/api-reference/doc#subscribe(listener) for more details.'
      )
    }

    let isSubscribed = true

    ensureCanMutateNextListeners()
    nextListeners.push(listener)

    return function unsubscribe() {
      if (!isSubscribed) {
        return
      }

      if (isEditing) {
        throw new Error(
          'You may not unsubscribe from a doc listener while the howToEdit is executing. ' +
            'See https://redux.js.org/api-reference/doc#subscribe(listener) for more details.'
        )
      }

      isSubscribed = false

      ensureCanMutateNextListeners()
      const index = nextListeners.indexOf(listener)
      nextListeners.splice(index, 1)
    }
  }

  /**
   * edites an whatToEdit. It is the only way to trigger a state change.
   *
   * The `howToEdit` function, used to create the doc, will be called with the
   * current state tree and the given `whatToEdit`. Its return value will
   * be considered the **next** state of the tree, and the change listeners
   * will be notified.
   *
   * The base implementation only supports plain object whatToEdits. If you want to
   * edit a Promise, an Observable, a thunk, or something else, you need to
   * wrap your doc creating function into the corresponding middleware. For
   * example, see the documentation for the `redux-thunk` package. Even the
   * middleware will eventually edit plain object whatToEdits using this method.
   *
   * @param {Object} whatToEdit A plain object representing “what changed”. It is
   * a good idea to keep whatToEdits serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An whatToEdit must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for whatToEdit types.
   *
   * @returns {Object} For convenience, the same whatToEdit object you edited.
   *
   * Note that, if you use a custom middleware, it may wrap `edit()` to
   * return something else (for example, a Promise you can await).
   */
  function edit(whatToEdit) {
    if (!isPlainObject(whatToEdit)) {
      throw new Error(
        'whatToEdits must be plain objects. ' +
          'Use custom middleware for async whatToEdits.'
      )
    }

    if (typeof whatToEdit.type === 'undefined') {
      throw new Error(
        'whatToEdits may not have an undefined "type" property. ' +
          'Have you misspelled a constant?'
      )
    }

    if (isEditing) {
      throw new Error('howToEdits may not edit whatToEdits.')
    }

    try {
      isEditing = true
      currentContent = currentHowToEdit(currentContent, whatToEdit)
    } finally {
      isEditing = false
    }

    const listeners = (currentListeners = nextListeners)
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i]
      listener()
    }

    return whatToEdit
  }

  /**
   * Replaces the howToEdit currently used by the doc to calculate the state.
   *
   * You might need this if your app implements code splitting and you want to
   * load some of the howToEdits dynamically. You might also need this if you
   * implement a hot reloading mechanism for Redux.
   *
   * @param {Function} nextHowToEdit The howToEdit for the doc to use instead.
   * @returns {void}
   */
  function replaceHowToEdit(nextHowToEdit) {
    if (typeof nextHowToEdit !== 'function') {
      throw new Error('Expected the nextHowToEdit to be a function.')
    }

    currentHowToEdit = nextHowToEdit

    // This whatToEdit has a similiar effect to whatToEditTypes.INIT.
    // Any howToEdits that existed in both the new and old roothowToEdit
    // will receive the previous state. This effectively populates
    // the new state tree with any relevant data from the old one.
    edit({ type: whatToEditTypes.REPLACE })
  }

  /**
   * Interoperability point for observable/reactive libraries.
   * @returns {observable} A minimal observable of state changes.
   * For more information, see the observable proposal:
   * https://github.com/tc39/proposal-observable
   */
  function observable() {
    const outerSubscribe = subscribe
    return {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the doc, and prevent further
       * emission of values from the observable.
       */
      subscribe(observer) {
        if (typeof observer !== 'object' || observer === null) {
          throw new TypeError('Expected the observer to be an object.')
        }

        function observeState() {
          if (observer.next) {
            observer.next(getContent())
          }
        }

        observeState()
        const unsubscribe = outerSubscribe(observeState)
        return { unsubscribe }
      },

      [$$observable]() {
        return this
      }
    }
  }

  // When a doc is created, an "INIT" whatToEdit is edited so that every
  // howToEdit returns their initial state. This effectively populates
  // the initial state tree.
  edit({ type: whatToEditTypes.INIT })

  return {
    edit,
    subscribe,
    getContent,
    replaceHowToEdit,
    [$$observable]: observable
  }
}
