/**
 * 定义函数复合者 functionComposer(f,g,h) = x=>f(g(h(x)))
 * 其中参数x用parameter的缩写par表示
 *
 * @param {...Function} funcs 是复合前的函数们，例如f(),g(),h()
 * @returns {Function} 是复合后的函数
 */

export default function functionComposer(...funcs) {
  if (funcs.length === 0) {
    return par => par
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  return funcs.reduce((a, b) => (...pars) => a(b(...pars)))
}
