/**
 * 定义复合函数 composeFunction(f,g,h) = x=>f(g(h(x)))
 * 其中参数x用parameter的缩写par表示
 *
 * @param {...Function} funcs 是将被被复合的函数f(),g(),h()
 * @returns {Function} 是经过复合的复合函数
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
