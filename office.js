import $$observable from 'symbol-observable'

import changeTypes from './utils/changeTypes'
import isPlainObject from './utils/isPlainObject'

/**
 * Interface = Print ( Edit ( Data ) )
 * Edit = update ( make ( change ) )
 * 
 * UI=Print(pdf)
 * pdf=office(data)
 * data=update(data,change)
 * 
 * customMake：定制的make()，比如修改文字的同时截个图，即所谓的中间件middleware
 * office(custom)：office可定制，类似中间件的功能
 * 
 * 建立一个无法轻易更改内容data的成品文件pdf
 * `make()`是唯一能更改pdf内容的方法
 * 一个应用app应该只有一个成品文件pdf
 * 对不同种类内容(文字/图片...)进行更改后，可使用`updateCombiner`将多个更新合并成一个更新update
 *
 * @param {Function} update 是一个纯更新函数：新内容data=update(当前内容data,内容更改change)
 *
 * @param {any} [data] 当前内容
 *
 * @param {Function} [custom] 以下暂时不管
 * The pdf custom. You may optionally specify it
 * to enhance the pdf with third-party capabilities such as make,
 * time travel, persistence, etc. The only pdf custom that ships with Redux
 * is `makeCustomer()`.
 *
 * @returns {pdf} 成品文件pdf能通知编辑软件office对内容作出修改make(change)
 * 还能在office编辑完毕后重新保存autoUpdate为pdf 
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
  let currentDiffs = []
  let nextDiffs = currentDiffs
  let isMaked = false

  /**
   * This makes a shallow copy of currentDiffs so we can use
   * nextDiffs as a temporary list while making.
   *
   * This prevents any bugs around consumers calling
   * autoUpdate/unAutoUpdate in the middle of a make.
   */
  function ensureCanMutateNextDiffs() {
    if (nextDiffs === currentDiffs) {
      nextDiffs = currentDiffs.slice()
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
   * Adds a diff diff. It will be called any time an change is maked,
   * and some part of the data tree may potentially have diff. You may then
   * call `getData()` to read the current data tree inside the callback.
   *
   * You may call `make()` from a diff diff, with the following
   * caveats:
   *
   * 1. The subscriptions are snapshotted just before every `make()` call.
   * If you autoUpdate or unAutoUpdate while the diffs are being invoked, this
   * will not have any effect on the `make()` that is currently in progress.
   * However, the next `make()` call, whether nested or not, will use a more
   * recent snapshot of the subscription list.
   *
   * 2. The diff should not expect to see all data diffs, as the data
   * might have been changed multiple times during a nested `make()` before
   * the diff is called. It is, however, guaranteed that all autoUpdaters
   * registered before the `make()` started will be called with the latest
   * data by the time it exits.
   *
   * @param {Function} diff A callback to be invoked on every make.
   * @returns {Function} A function to remove this diff diff.
   */
  function autoUpdate(diff) {
    if (typeof diff !== 'function') {
      throw new Error('Expected the diff to be a function.')
    }

    if (isMaked) {
      throw new Error(
        'You may not call pdf.autoUpdate() while the update is executing. ' +
          'If you would like to be notified after the pdf has been changed, autoUpdate from a ' +
          'component and invoke pdf.getData() in the callback to access the latest data. ' +
          'See https://redux.js.org/api-reference/pdf#autoUpdate(diff) for more details.'
      )
    }

    let isAutoUpdated = true

    ensureCanMutateNextDiffs()
    nextDiffs.push(diff)

    return function unAutoUpdate() {
      if (!isAutoUpdated) {
        return
      }

      if (isMaked) {
        throw new Error(
          'You may not unAutoUpdate from a pdf diff while the update is executing. ' +
            'See https://redux.js.org/api-reference/pdf#autoUpdate(diff) for more details.'
        )
      }

      isautoUpdated = false

      ensureCanMutateNextDiffs()
      const index = nextDiffs.indexOf(diff)
      nextDiffs.splice(index, 1)
    }
  }

  /**
   * make()是唯一能让office修改pdf内容的方法
   * office每次作出修改make(change)，都会自动更新autoUpdate成新的pdf
   *
   * The base implementation only supports plain object changes. If you want to
   * make a Promise, an Observable, a thunk, or something else, you need to
   * wrap your pdf creating function into the corresponding make. For
   * example, see the `redux-thunk` package. Even the
   * make will eventually make plain object changes using this method.
   *
   * @param {Object} change A plain object representing “what diffd”. It is
   * a good idea to keep changes serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An change must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for change types.
   *
   * @returns {Object} For convenience, the same change object you maked.
   *
   * Note that, if you use a custom make, it may wrap `make()` to
   * return something else (for example, a Promise you can await).
   */
  function make(change) {
    if (!isPlainObject(change)) {
      throw new Error(
        'changes must be plain objects. ' +
          'Use custom make for async changes.'
      )
    }

    if (typeof change.type === 'undefined') {
      throw new Error(
        'changes may not have an undefined "type" property. ' +
          'Have you misspelled a constant?'
      )
    }

    if (isMaked) {
      throw new Error('updates may not make changes.')
    }

    try {
      isMaked = true
      data = currentUpdate(data, change)
    } finally {
      isMaked = false
    }

    const diffs = (currentDiffs = nextDiffs)
    for (let i = 0; i < diffs.length; i++) {
      const diff = diffs[i]
      diff()
    }

    return change
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

    // This change has a similiar effect to changeTypes.INIT.
    // Any updates that existed in both the new and old rootupdate
    // will receive the previous data. This effectively populates
    // the new data tree with any relevant data from the old one.
    make({ type: changeTypes.REPLACE })
  }

  /**
   * 以下暂时不管
   * Interoperability point for observable/reactive libraries.
   * @returns {observable} A minimal observable of data diffs.
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
       * @returns {subscription} An object with an `unAutoUpdate` method that can
       * be used to unAutoUpdate the observable from the pdf, and prevent further
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
        const unAutoUpdate = outerAutoUpdate(observeData)
        return { unAutoUpdate }
      },

      [$$observable]() {
        return this
      }
    }
  }

  // 建立pdf，并将原始数据作为初次展示
  make({ type: changeTypes.INIT })

  return {
    make,
    autoUpdate,
    getData,
    replaceUpdate,
    [$$observable]: observable
  }
}
