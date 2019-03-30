import $$observable from 'symbol-observable'

import editTypes from './utils/editTypes'
import isPlainObject from './utils/isPlainObject'

/**
 * 建立一个不可轻易更改内部数据data的成品数据集pdf
 * `send()`是唯一能更改pdf内数据的方法
 * 一个应用app应该只有一个成品数据集pdf
 * 若要进行不同种类的数据编辑，可使用`combineUpdates`将多个更新合并成一个更新update
 *
 * @param {Function} update 是一个纯更新函数：新数据newData=update(当前数据currentData,数据编辑edit)
 *
 * @param {any} [currentData] 初始数据/当前数据
 * If you use `combineUpdates` to produce the root update function, this must be
 * an object with the same shape as `combineUpdates` keys.
 *
 * @param {Function} [enhancer] The pdf enhancer. You may optionally specify it
 * to enhance the pdf with third-party capabilities such as middleware,
 * time travel, persistence, etc. The only pdf enhancer that ships with Redux
 * is `applyMiddleware()`.
 *
 * @returns {pdf} 一个成品数据集，能发送编辑请求send/edit给编辑办公室office，还能在检测到数据有改动后
 * 进行自动更新autoUpdate 
 */
export default function office(update, currentData, enhancer) {
  if (
    (typeof currentData === 'function' && typeof enhancer === 'function') ||
    (typeof enhancer === 'function' && typeof parameters[3] === 'function')
  ) {
    throw new Error(
      'It looks like you are passing several pdf enhancers to ' +
        'office(). This is not supported. Instead, compose them ' +
        'together to a single function.'
    )
  }

  if (typeof currentData === 'function' && typeof enhancer === 'undefined') {
    enhancer = currentData
    currentData = undefined
  }

  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }

    return enhancer(office)(update, currentData)
  }

  if (typeof update !== 'function') {
    throw new Error('Expected the update to be a function.')
  }

  let currentUpdate = update
  let currentData = preData
  let currentChanges = []
  let nextChanges = currentChanges
  let isSending = false

  /**
   * This makes a shallow copy of currentChanges so we can use
   * nextChanges as a temporary list while sending.
   *
   * This prevents any bugs around consumers calling
   * autoUpdate/unAutoUpdate in the middle of a send.
   */
  function ensureCanMutatenextChanges() {
    if (nextChanges === currentChanges) {
      nextChanges = currentChanges.slice()
    }
  }

  /**
   * Reads the data tree managed by the pdf.
   *
   * @returns {any} The current data tree of your application.
   */
  function getData() {
    if (isSending) {
      throw new Error(
        'You may not call pdf.getData() while the update is executing. ' +
          'The update has already received the data as an parameter. ' +
          'Pass it down from the top update instead of reading it from the pdf.'
      )
    }

    return currentData
  }

  /**
   * Adds a change change. It will be called any time an edit is sended,
   * and some part of the data tree may potentially have changed. You may then
   * call `getData()` to read the current data tree inside the callback.
   *
   * You may call `send()` from a change change, with the following
   * caveats:
   *
   * 1. The subscriptions are snapshotted just before every `send()` call.
   * If you autoUpdate or unautoUpdate while the changes are being invoked, this
   * will not have any effect on the `send()` that is currently in progress.
   * However, the next `send()` call, whether nested or not, will use a more
   * recent snapshot of the subscription list.
   *
   * 2. The change should not expect to see all data changes, as the data
   * might have been editd multiple times during a nested `send()` before
   * the change is called. It is, however, guaranteed that all autoUpdaters
   * registered before the `send()` started will be called with the latest
   * data by the time it exits.
   *
   * @param {Function} change A callback to be invoked on every send.
   * @returns {Function} A function to remove this change change.
   */
  function autoUpdate(change) {
    if (typeof change !== 'function') {
      throw new Error('Expected the change to be a function.')
    }

    if (isSending) {
      throw new Error(
        'You may not call pdf.autoUpdate() while the update is executing. ' +
          'If you would like to be notified after the pdf has been editd, autoUpdate from a ' +
          'component and invoke pdf.getData() in the callback to access the latest data. ' +
          'See https://redux.js.org/api-reference/pdf#autoUpdate(change) for more details.'
      )
    }

    let isAutoUpdated = true

    ensureCanMutatenextChanges()
    nextChanges.push(change)

    return function unAutoUpdate() {
      if (!isAutoUpdated) {
        return
      }

      if (isSending) {
        throw new Error(
          'You may not unAutoUpdate from a pdf change while the update is executing. ' +
            'See https://redux.js.org/api-reference/pdf#autoUpdate(change) for more details.'
        )
      }

      isAutoUpdated = false

      ensureCanMutatenextChanges()
      const index = nextChanges.indexOf(change)
      nextChanges.splice(index, 1)
    }
  }

  /**
   * sendes an edit. It is the only way to trigger a data change.
   *
   * The `update` function, used to create the pdf, will be called with the
   * current data tree and the given `edit`. Its return value will
   * be considered the **next** data of the tree, and the change changes
   * will be notified.
   *
   * The base implementation only supports plain object edits. If you want to
   * send a Promise, an Observable, a thunk, or something else, you need to
   * wrap your pdf creating function into the corresponding middleware. For
   * example, see the officeumentation for the `redux-thunk` package. Even the
   * middleware will eventually send plain object edits using this method.
   *
   * @param {Object} edit A plain object representing “what changed”. It is
   * a good idea to keep edits serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An edit must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for edit types.
   *
   * @returns {Object} For convenience, the same edit object you sended.
   *
   * Note that, if you use a custom middleware, it may wrap `send()` to
   * return something else (for example, a Promise you can await).
   */
  function send(edit) {
    if (!isPlainObject(edit)) {
      throw new Error(
        'edits must be plain objects. ' +
          'Use custom middleware for async edits.'
      )
    }

    if (typeof edit.type === 'undefined') {
      throw new Error(
        'edits may not have an undefined "type" property. ' +
          'Have you misspelled a constant?'
      )
    }

    if (isSending) {
      throw new Error('updates may not send edits.')
    }

    try {
      isSending = true
      currentData = currentUpdate(currentData, edit)
    } finally {
      isSending = false
    }

    const changes = (currentChanges = nextChanges)
    for (let i = 0; i < changes.length; i++) {
      const change = changes[i]
      change()
    }

    return edit
  }

  /**
   * Replaces the update currently used by the pdf to calculate the data.
   *
   * You might need this if your app implements code splitting and you want to
   * load some of the updates dynamically. You might also need this if you
   * implement a hot reloading mechanism for Redux.
   *
   * @param {Function} nextUpdate The update for the pdf to use instead.
   * @returns {void}
   */
  function replaceUpdate(nextUpdate) {
    if (typeof nextUpdate !== 'function') {
      throw new Error('Expected the nextUpdate to be a function.')
    }

    currentUpdate = nextUpdate

    // This edit has a similiar effect to editTypes.INIT.
    // Any updates that existed in both the new and old rootupdate
    // will receive the previous data. This effectively populates
    // the new data tree with any relevant data from the old one.
    send({ type: editTypes.REPLACE })
  }

  /**
   * Interoperability point for observable/reactive libraries.
   * @returns {observable} A minimal observable of data changes.
   * For more information, see the observable proposal:
   * https://github.com/tc39/proposal-observable
   */
  function observable() {
    const outerAutoUpdate = autoUpdate
    return {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unautoUpdate` method that can
       * be used to unautoUpdate the observable from the pdf, and prevent further
       * emission of values from the observable.
       */
      autoUpdate(observer) {
        if (typeof observer !== 'object' || observer === null) {
          throw new TypeError('Expected the observer to be an object.')
        }

        function observeData() {
          if (observer.next) {
            observer.next(getData())
          }
        }

        observeData()
        const unautoUpdate = outerAutoUpdate(observeData)
        return { unautoUpdate }
      },

      [$$observable]() {
        return this
      }
    }
  }

  // When a pdf is created, an "INIT" edit is sent so that every
  // update returns their initial data. This effectively populates
  // the initial data tree.
  send({ type: editTypes.INIT })

  return {
    send,
    autoUpdate,
    getData,
    replaceUpdate,
    [$$observable]: observable
  }
}
