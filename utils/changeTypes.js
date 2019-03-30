/**
 * These are private change types reserved by Redux.
 * For any unknown changes, you must return the current state.
 * If the current state is undefined, you must return the initial state.
 * Do not reference these change types directly in your code.
 */

const randomString = () =>
  Math.random()
    .toString(36)
    .substring(7)
    .split('')
    .join('.')

const changeTypes = {
  INIT: `@@redux/INIT${randomString()}`,
  REPLACE: `@@redux/REPLACE${randomString()}`,
  PROBE_UNKNOWN_change: () => `@@redux/PROBE_UNKNOWN_change${randomString()}`
}

export default changeTypes
