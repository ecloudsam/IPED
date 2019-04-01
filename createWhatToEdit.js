function bindwhatToEditCreator(whatToEditCreator, edit) {
  return function() {
    return edit(whatToEditCreator.apply(this, arguments))
  }
}

/**
 * Turns an object whose values are whatToEdit creators, into an object with the
 * same keys, but with every function wrapped into a `edit` call so they
 * may be invoked directly. This is just a convenience method, as you can call
 * `doc.edit(MywhatToEditCreators.doSomething())` yourself just fine.
 *
 * For convenience, you can also pass an whatToEdit creator as the first argument,
 * and get a edit wrapped function in return.
 *
 * @param {Function|Object} whatToEditCreators An object whose values are whatToEdit
 * creator functions. One handy way to obtain it is to use ES6 `import * as`
 * syntax. You may also pass a single function.
 *
 * @param {Function} edit The `edit` function available on your Redux
 * doc.
 *
 * @returns {Function|Object} The object mimicking the original object, but with
 * every whatToEdit creator wrapped into the `edit` call. If you passed a
 * function as `whatToEditCreators`, the return value will also be a single
 * function.
 */
export default function bindwhatToEditCreators(whatToEditCreators, edit) {
  if (typeof whatToEditCreators === 'function') {
    return bindwhatToEditCreator(whatToEditCreators, edit)
  }

  if (typeof whatToEditCreators !== 'object' || whatToEditCreators === null) {
    throw new Error(
      `bindwhatToEditCreators expected an object or a function, instead received ${
        whatToEditCreators === null ? 'null' : typeof whatToEditCreators
      }. ` +
        `Did you write "import whatToEditCreators from" instead of "import * as whatToEditCreators from"?`
    )
  }

  const boundWhatToEditCreators = {}
  for (const key in whatToEditCreators) {
    const whatToEditCreator = whatToEditCreators[key]
    if (typeof whatToEditCreator === 'function') {
      boundWhatToEditCreators[key] = bindwhatToEditCreator(whatToEditCreator, edit)
    }
  }
  return boundWhatToEditCreators
}
