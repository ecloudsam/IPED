/**
 * Composes single-parameter functions from right to left. The rightmost
 * function can take multiple parameters as it provides the signature for
 * the resulting composite function.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the parameter functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...pars) => f(g(h(...pars))).
 */

export default function compose(...funcs) {
  if (funcs.length === 0) {
    return par => par
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  return funcs.reduce((a, b) => (...pars) => a(b(...pars)))
}
