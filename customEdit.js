import composeFunction from './composeFunction'

/**
 * Creates a doc custom that applies middleware to the edit method
 * of the Redux doc. This is handy for a variety of tasks, such as expressing
 * asynchronous whatToEdits in a concise manner, or logging every whatToEdit payload.
 *
 * See `redux-thunk` package as an example of the Redux middleware.
 *
 * Because middleware is potentially asynchronous, this should be the first
 * doc custom in the composition chain.
 *
 * Note that each middleware will be given the `edit` and `getContent` functions
 * as named paruments.
 *
 * @param {...Function} customEdit The middleware chain to be applied.
 * @returns {Function} A doc custom applying the middleware.
 */
export default function applyCustomEdit(...customEdit) {
  return office => (...pars) => {
    const doc = office(...pars)
    let edit = () => {
      throw new Error(
        'editing while constructing your middleware is not allowed. ' +
          'Other middleware would not be applied to this edit.'
      )
    }

    const middlewareAPI = {
      getContent: doc.getContent,
      edit: (...pars) => edit(...pars)
    }
    const chain = customEdit.map(middleware => middleware(middlewareAPI))
    edit = composeFunction(...chain)(doc.edit)

    return {
      ...doc,
      edit
    }
  }
}
