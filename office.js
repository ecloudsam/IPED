import $$observable from 'symbol-observable'

import editTypes from './utils/editTypes'
import isPlainObject from './utils/isPlainObject'

/**
 * Interface = Print ( Edit ( Data ) )
 * 
 * UI=Print(pdf)
 * pdf=office(data)
 * data=update(data,edit)
 * 
 * 建立一个无法轻易更改内容data的成品文件pdf
 * `make()`是唯一能修改pdf内容的方法
 * 一个应用app应该只有一个成品文件pdf
 * 对不同种类内容(文字/图片...)进行编辑，可使用`updateCombiner`将多个更新合并成一个更新update
 *
 * @param {Function} update 是一个纯更新函数：新内容data=update(当前内容data,内容编辑edit)
 *
 * @param {any} [data] 当前内容
 *
 * @param {Function} [custom] 以下暂时不管
 * The pdf custom. You may optionally specify it
 * to enhance the pdf with third-party capabilities such as make,
 * time travel, persistence, etc. The only pdf custom that ships with Redux
 * is `makeCustomer()`.
 *
 * @returns {pdf} 成品文件pdf能通知编辑软件office对内容作出修改make(edit)
 * 还能在office编辑完毕后重新保存autoSave为pdf 
 */
export default function office(update, data, custom) {
  if (
    (typeof data === 'function' && typeof custom === 'function') ||
    (typeof custom === 'function' && typeof parameters[3] === 'function')
  ) {
    throw new Error(
      'It looks like you are passing several pdf customs to ' +
        'office(). This is not supported. Instead, compose them ' +
        'together to a single function.'
    )
  }

  if (typeof data === 'function' && typeof custom === 'undefined') {
    custom = data
    data = undefined
  }

  if (typeof custom !== 'undefined') {
    if (typeof custom !== 'function') {
      throw new Error('Expected the custom to be a function.')
    }

    return custom(office)(update, data)
  }

  if (typeof update !== 'function') {
    throw new Error('Expected the update to be a function.')
  }

  let currentUpdate = update
  let data = preData
  let currentChanges = []
  let nextChanges = currentChanges
  let isMaked = false

  /**
   * This makes a shallow copy of currentChanges so we can use
   * nextChanges as a temporary list while makeing.
   *
   * This prevents any bugs around consumers calling
   * autoSave/unAutoSave in the middle of a make.
   */
  function ensureCanMutateNextChanges() {
    if (nextChanges === currentChanges) {
      nextChanges = currentChanges.slice()
    }
  }

  /**
   * 
   * @returns {any} 获取当前pdf的内容
   */
  function getData() {
    if (isMaked) {
      throw new Error(
        'You may not call pdf.getData() while the update is executing. ' +
          'The update has already received the data as an parameter. ' +
          'Pass it down from the top update instead of reading it from the pdf.'
      )
    }

    return data
  }

  /**
   * Adds a change change. It will be called any time an edit is makeed,
   * and some part of the data tree may potentially have changed. You may then
   * call `getData()` to read the current data tree inside the callback.
   *
   * You may call `make()` from a change change, with the following
   * caveats:
   *
   * 1. The subscriptions are snapshotted just before every `make()` call.
   * If you autoSave or unAutoSave while the changes are being invoked, this
   * will not have any effect on the `make()` that is currently in progress.
   * However, the next `make()` call, whether nested or not, will use a more
   * recent snapshot of the subscription list.
   *
   * 2. The change should not expect to see all data changes, as the data
   * might have been editd multiple times during a nested `make()` before
   * the change is called. It is, however, guaranteed that all autoSavers
   * registered before the `make()` started will be called with the latest
   * data by the time it exits.
   *
   * @param {Function} change A callback to be invoked on every make.
   * @returns {Function} A function to remove this change change.
   */
  function autoSave(change) {
    if (typeof change !== 'function') {
      throw new Error('Expected the change to be a function.')
    }

    if (isMaked) {
      throw new Error(
        'You may not call pdf.autoSave() while the update is executing. ' +
          'If you would like to be notified after the pdf has been editd, autoSave from a ' +
          'component and invoke pdf.getData() in the callback to access the latest data. ' +
          'See https://redux.js.org/api-reference/pdf#autoSave(change) for more details.'
      )
    }

    let isAutoSaved = true

    ensureCanMutateNextChanges()
    nextChanges.push(change)

    return function unAutoSave() {
      if (!isAutoSaved) {
        return
      }

      if (isMaked) {
        throw new Error(
          'You may not unAutoSave from a pdf change while the update is executing. ' +
            'See https://redux.js.org/api-reference/pdf#autoSave(change) for more details.'
        )
      }

      isAutoSaved = false

      ensureCanMutateNextChanges()
      const index = nextChanges.indexOf(change)
      nextChanges.splice(index, 1)
    }
  }

  /**
   * make()是唯一能让office修改pdf内容的方法
   * office每次作出修改make(edit)，都会更新内容update并自动保存autoSave为新的pdf
   *
   * The base implementation only supports plain object edits. If you want to
   * make a Promise, an Observable, a thunk, or something else, you need to
   * wrap your pdf creating function into the corresponding make. For
   * example, see the officeumentation for the `redux-thunk` package. Even the
   * make will eventually make plain object edits using this method.
   *
   * @param {Object} edit A plain object representing “what changed”. It is
   * a good idea to keep edits serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An edit must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for edit types.
   *
   * @returns {Object} For convenience, the same edit object you maked.
   *
   * Note that, if you use a custom make, it may wrap `make()` to
   * return something else (for example, a Promise you can await).
   */
  function make(edit) {
    if (!isPlainObject(edit)) {
      throw new Error(
        'edits must be plain objects. ' +
          'Use custom make for async edits.'
      )
    }

    if (typeof edit.type === 'undefined') {
      throw new Error(
        'edits may not have an undefined "type" property. ' +
          'Have you misspelled a constant?'
      )
    }

    if (isMaked) {
      throw new Error('updates may not make edits.')
    }

    try {
      isMaked = true
      data = currentUpdate(data, edit)
    } finally {
      isMaked = false
    }

    const changes = (currentChanges = nextChanges)
    for (let i = 0; i < changes.length; i++) {
      const change = changes[i]
      change()
    }

    return edit
  }

  /**
   * 以下暂时不管
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
    make({ type: editTypes.REPLACE })
  }

  /**
   * 以下暂时不管
   * Interoperability point for observable/reactive libraries.
   * @returns {observable} A minimal observable of data changes.
   * For more information, see the observable proposal:
   * https://github.com/tc39/proposal-observable
   */
  function observable() {
    const outerAutoSave = autoSave
    return {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unAutoSave` method that can
       * be used to unAutoSave the observable from the pdf, and prevent further
       * emission of values from the observable.
       */
      autoSave(observer) {
        if (typeof observer !== 'object' || observer === null) {
          throw new TypeError('Expected the observer to be an object.')
        }

        function observeData() {
          if (observer.next) {
            observer.next(getData())
          }
        }

        observeData()
        const unAutoSave = outerAutoSave(observeData)
        return { unAutoSave }
      },

      [$$observable]() {
        return this
      }
    }
  }

  // 建立pdf，并将原始数据作为初次展示
  make({ type: editTypes.INIT })

  return {
    make,
    autoSave,
    getData,
    replaceUpdate,
    [$$observable]: observable
  }
}
