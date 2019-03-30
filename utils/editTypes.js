/**
 * These are private edit types reserved by Redux.
 * For any unknown edits, you must return the current state.
 * If the current state is undefined, you must return the initial state.
 * Do not reference these edit types directly in your code.
 */

const randomString = () =>
  Math.random()
    .toString(36)
    .substring(7)
    .split('')
    .join('.')

const editTypes = {
  INIT: `@@redux/INIT${randomString()}`,
  REPLACE: `@@redux/REPLACE${randomString()}`,
  PROBE_UNKNOWN_edit: () => `@@redux/PROBE_UNKNOWN_edit${randomString()}`
}

export default editTypes
