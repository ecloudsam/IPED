import whatToEditTypes from './utils/whatToEditTypes'
import warning from './utils/warning'
import isPlainObject from './utils/isPlainObject'

function getUndefinedStateErrorMessage(key, whatToEdit) {
  const whatToEditType = whatToEdit && whatToEdit.type
  const whatToEditDescription =
    (whatToEditType && `whatToEdit "${String(whatToEditType)}"`) || 'an whatToEdit'

  return (
    `Given ${whatToEditDescription}, howToEdit "${key}" returned undefined. ` +
    `To ignore an whatToEdit, you must explicitly return the previous state. ` +
    `If you want this howToEdit to hold no value, you can return null instead of undefined.`
  )
}

function getUnexpectedStateShapeWarningMessage(
  inputState,
  howToEdit,
  whatToEdit,
  unexpectedKeyCache
) {
  const howToEditKeys = Object.keys(howToEdit)
  const argumentName =
    whatToEdit && whatToEdit.type === whatToEditTypes.INIT
      ? 'preContent argument passed to office'
      : 'previous state received by the howToEdit'

  if (howToEditKeys.length === 0) {
    return (
      'doc does not have a valid howToEdit. Make sure the argument passed ' +
      'to combineHowToEdit is an object whose values are howToEdit.'
    )
  }

  if (!isPlainObject(inputState)) {
    return (
      `The ${argumentName} has unexpected type of "` +
      {}.toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] +
      `". Expected argument to be an object with the following ` +
      `keys: "${howToEditKeys.join('", "')}"`
    )
  }

  const unexpectedKeys = Object.keys(inputState).filter(
    key => !howToEdit.hasOwnProperty(key) && !unexpectedKeyCache[key]
  )

  unexpectedKeys.forEach(key => {
    unexpectedKeyCache[key] = true
  })

  if (whatToEdit && whatToEdit.type === whatToEditTypes.REPLACE) return

  if (unexpectedKeys.length > 0) {
    return (
      `Unexpected ${unexpectedKeys.length > 1 ? 'keys' : 'key'} ` +
      `"${unexpectedKeys.join('", "')}" found in ${argumentName}. ` +
      `Expected to find one of the known howToEdit keys instead: ` +
      `"${howToEditKeys.join('", "')}". Unexpected keys will be ignored.`
    )
  }
}

function assertHowToEdithape(howToEdit) {
  Object.keys(howToEdit).forEach(key => {
    const howToEdit = howToEdit[key]
    const initialState = howToEdit(undefined, { type: whatToEditTypes.INIT })

    if (typeof initialState === 'undefined') {
      throw new Error(
        `howToEdit "${key}" returned undefined during initialization. ` +
          `If the state passed to the howToEdit is undefined, you must ` +
          `explicitly return the initial state. The initial state may ` +
          `not be undefined. If you don't want to set a value for this howToEdit, ` +
          `you can use null instead of undefined.`
      )
    }

    if (
      typeof howToEdit(undefined, {
        type: whatToEditTypes.PROBE_UNKNOWN_whatToEdit()
      }) === 'undefined'
    ) {
      throw new Error(
        `howToEdit "${key}" returned undefined when probed with a random type. ` +
          `Don't try to handle ${
            whatToEditTypes.INIT
          } or other whatToEdits in "redux/*" ` +
          `namespace. They are considered private. Instead, you must return the ` +
          `current state for any unknown whatToEdits, unless it is undefined, ` +
          `in which case you must return the initial state, regardless of the ` +
          `whatToEdit type. The initial state may not be undefined, but can be null.`
      )
    }
  })
}

/**
 * Turns an object whose values are different howToEdit functions, into a single
 * howToEdit function. It will call every child howToEdit, and gather their results
 * into a single state object, whose keys correspond to the keys of the passed
 * howToEdit functions.
 *
 * @param {Object} howToEdit An object whose values correspond to different
 * howToEdit functions that need to be combined into one. One handy way to obtain
 * it is to use ES6 `import * as howToEdit` syntax. The howToEdit may never return
 * undefined for any whatToEdit. Instead, they should return their initial state
 * if the state passed to them was undefined, and the current state for any
 * unrecognized whatToEdit.
 *
 * @returns {Function} A howToEdit function that invokes every howToEdit inside the
 * passed object, and builds a state object with the same shape.
 */
export default function combineHowToEdit(howToEdit) {
  const howToEditKeys = Object.keys(howToEdit)
  const finalHowToEdit = {}
  for (let i = 0; i < howToEditKeys.length; i++) {
    const key = howToEditKeys[i]

    if (process.env.NODE_ENV !== 'production') {
      if (typeof howToEdit[key] === 'undefined') {
        warning(`No howToEdit provided for key "${key}"`)
      }
    }

    if (typeof howToEdit[key] === 'function') {
      finalHowToEdit[key] = howToEdit[key]
    }
  }
  const finalHowToEditKeys = Object.keys(finalHowToEdit)

  // This is used to make sure we don't warn about the same
  // keys multiple times.
  let unexpectedKeyCache
  if (process.env.NODE_ENV !== 'production') {
    unexpectedKeyCache = {}
  }

  let shapeAssertionError
  try {
    assertHowToEdithape(finalHowToEdit)
  } catch (e) {
    shapeAssertionError = e
  }

  return function combination(state = {}, whatToEdit) {
    if (shapeAssertionError) {
      throw shapeAssertionError
    }

    if (process.env.NODE_ENV !== 'production') {
      const warningMessage = getUnexpectedStateShapeWarningMessage(
        state,
        finalHowToEdit,
        whatToEdit,
        unexpectedKeyCache
      )
      if (warningMessage) {
        warning(warningMessage)
      }
    }

    let hasChanged = false
    const nextState = {}
    for (let i = 0; i < finalHowToEditKeys.length; i++) {
      const key = finalHowToEditKeys[i]
      const howToEdit = finalHowToEdit[key]
      const previousStateForKey = state[key]
      const nextStateForKey = howToEdit(previousStateForKey, whatToEdit)
      if (typeof nextStateForKey === 'undefined') {
        const errorMessage = getUndefinedStateErrorMessage(key, whatToEdit)
        throw new Error(errorMessage)
      }
      nextState[key] = nextStateForKey
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey
    }
    return hasChanged ? nextState : state
  }
}
