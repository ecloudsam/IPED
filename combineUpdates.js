import editTypes from './utils/editTypes'
import warning from './utils/warning'
import isPlainObject from './utils/isPlainObject'

function getUndefinedDataErrorMessage(key, edit) {
  const editType = edit && edit.type
  const editDescription =
    (editType && `edit "${String(editType)}"`) || 'an edit'

  return (
    `Given ${editDescription}, update "${key}" returned undefined. ` +
    `To ignore an edit, you must explicitly return the previous data. ` +
    `If you want this update to hold no value, you can return null instead of undefined.`
  )
}

function getUnexpectedDataShapeWarningMessage(
  inputData,
  updates,
  edit,
  unexpectedKeyCache
) {
  const updateKeys = Object.keys(updates)
  const parameterName =
    edit && edit.type === editTypes.INIT
      ? 'preData parameter passed to createStore'
      : 'previous data received by the update'

  if (updateKeys.length === 0) {
    return (
      'Store does not have a valid update. Make sure the parameter passed ' +
      'to combineUpdates is an object whose values are updates.'
    )
  }

  if (!isPlainObject(inputData)) {
    return (
      `The ${parameterName} has unexpected type of "` +
      {}.toString.call(inputData).match(/\s([a-z|A-Z]+)/)[1] +
      `". Expected parameter to be an object with the following ` +
      `keys: "${updateKeys.join('", "')}"`
    )
  }

  const unexpectedKeys = Object.keys(inputData).filter(
    key => !updates.hasOwnProperty(key) && !unexpectedKeyCache[key]
  )

  unexpectedKeys.forEach(key => {
    unexpectedKeyCache[key] = true
  })

  if (edit && edit.type === editTypes.REPLACE) return

  if (unexpectedKeys.length > 0) {
    return (
      `Unexpected ${unexpectedKeys.length > 1 ? 'keys' : 'key'} ` +
      `"${unexpectedKeys.join('", "')}" found in ${parameterName}. ` +
      `Expected to find one of the known update keys instead: ` +
      `"${updateKeys.join('", "')}". Unexpected keys will be ignored.`
    )
  }
}

function assertUpdateShape(updates) {
  Object.keys(updates).forEach(key => {
    const update = updates[key]
    const initialData = update(undefined, { type: editTypes.INIT })

    if (typeof initialData === 'undefined') {
      throw new Error(
        `update "${key}" returned undefined during initialization. ` +
          `If the data passed to the update is undefined, you must ` +
          `explicitly return the initial data. The initial data may ` +
          `not be undefined. If you don't want to set a value for this update, ` +
          `you can use null instead of undefined.`
      )
    }

    if (
      typeof update(undefined, {
        type: editTypes.PROBE_UNKNOWN_edit()
      }) === 'undefined'
    ) {
      throw new Error(
        `update "${key}" returned undefined when probed with a random type. ` +
          `Don't try to handle ${
            editTypes.INIT
          } or other edits in "redux/*" ` +
          `namespace. They are considered private. Instead, you must return the ` +
          `current data for any unknown edits, unless it is undefined, ` +
          `in which case you must return the initial data, regardless of the ` +
          `edit type. The initial data may not be undefined, but can be null.`
      )
    }
  })
}

/**
 * Turns an object whose values are different update functions, into a single
 * update function. It will call every child update, and gather their results
 * into a single data object, whose keys correspond to the keys of the passed
 * update functions.
 *
 * @param {Object} updates An object whose values correspond to different
 * update functions that need to be combined into one. One handy way to obtain
 * it is to use ES6 `import * as updates` syntax. The updates may never return
 * undefined for any edit. Instead, they should return their initial data
 * if the data passed to them was undefined, and the current data for any
 * unrecognized edit.
 *
 * @returns {Function} A update function that invokes every update inside the
 * passed object, and builds a data object with the same shape.
 */
export default function combineUpdates(updates) {
  const updateKeys = Object.keys(updates)
  const finalUpdates = {}
  for (let i = 0; i < updateKeys.length; i++) {
    const key = updateKeys[i]

    if (process.env.NODE_ENV !== 'production') {
      if (typeof updates[key] === 'undefined') {
        warning(`No update provided for key "${key}"`)
      }
    }

    if (typeof updates[key] === 'function') {
      finalUpdates[key] = updates[key]
    }
  }
  const finalUpdateKeys = Object.keys(finalUpdates)

  // This is used to make sure we don't warn about the same
  // keys multiple times.
  let unexpectedKeyCache
  if (process.env.NODE_ENV !== 'production') {
    unexpectedKeyCache = {}
  }

  let shapeAssertionError
  try {
    assertUpdateShape(finalUpdates)
  } catch (e) {
    shapeAssertionError = e
  }

  return function combination(data = {}, edit) {
    if (shapeAssertionError) {
      throw shapeAssertionError
    }

    if (process.env.NODE_ENV !== 'production') {
      const warningMessage = getUnexpectedDataShapeWarningMessage(
        data,
        finalUpdates,
        edit,
        unexpectedKeyCache
      )
      if (warningMessage) {
        warning(warningMessage)
      }
    }

    let hasChanged = false
    const nextData = {}
    for (let i = 0; i < finalUpdateKeys.length; i++) {
      const key = finalUpdateKeys[i]
      const update = finalUpdates[key]
      const previousDataForKey = data[key]
      const nextDataForKey = update(previousDataForKey, edit)
      if (typeof nextDataForKey === 'undefined') {
        const errorMessage = getUndefinedDataErrorMessage(key, edit)
        throw new Error(errorMessage)
      }
      nextData[key] = nextDataForKey
      hasChanged = hasChanged || nextDataForKey !== previousDataForKey
    }
    return hasChanged ? nextData : data
  }
}
