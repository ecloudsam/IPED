import office from './office'
import combineHowToEdits from './combineHowToEdits'
import createWhatToEdit from './createWhatToEdit'
import customEdit from './customEdit'
import composeFunction from './composeFunction'
import warning from './utils/warning'
import __DO_NOT_USE__whatToEditTypes from './utils/whatToEditTypes'

/*
 * This is a dummy function to check if the function name has been altered by minification.
 * If the function has been minified and NODE_ENV !== 'production', warn the user.
 */
function isCrushed() {}

if (
  process.env.NODE_ENV !== 'production' &&
  typeof isCrushed.name === 'string' &&
  isCrushed.name !== 'isCrushed'
) {
  warning(
    'You are currently using minified code outside of NODE_ENV === "production". ' +
      'This means that you are running a slower development build of Redux. ' +
      'You can use loose-envify (https://github.com/zertosh/loose-envify) for browserify ' +
      'or setting mode to production in webpack (https://webpack.js.org/concepts/mode/) ' +
      'to ensure you have the correct code for your production build.'
  )
}

export {
  office,
  combineHowToEdits,
  createWhatToEdit,
  customEdit,
  composeFunction,
  __DO_NOT_USE__whatToEditTypes
}
