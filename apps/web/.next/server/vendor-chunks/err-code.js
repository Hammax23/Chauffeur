"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/err-code";
exports.ids = ["vendor-chunks/err-code"];
exports.modules = {

/***/ "(rsc)/../../node_modules/err-code/index.js":
/*!********************************************!*\
  !*** ../../node_modules/err-code/index.js ***!
  \********************************************/
/***/ ((module) => {

eval("\n\nfunction assign(obj, props) {\n    for (const key in props) {\n        Object.defineProperty(obj, key, {\n            value: props[key],\n            enumerable: true,\n            configurable: true,\n        });\n    }\n\n    return obj;\n}\n\nfunction createError(err, code, props) {\n    if (!err || typeof err === 'string') {\n        throw new TypeError('Please pass an Error to err-code');\n    }\n\n    if (!props) {\n        props = {};\n    }\n\n    if (typeof code === 'object') {\n        props = code;\n        code = undefined;\n    }\n\n    if (code != null) {\n        props.code = code;\n    }\n\n    try {\n        return assign(err, props);\n    } catch (_) {\n        props.message = err.message;\n        props.stack = err.stack;\n\n        const ErrClass = function () {};\n\n        ErrClass.prototype = Object.create(Object.getPrototypeOf(err));\n\n        return assign(new ErrClass(), props);\n    }\n}\n\nmodule.exports = createError;\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi4vLi4vbm9kZV9tb2R1bGVzL2Vyci1jb2RlL2luZGV4LmpzIiwibWFwcGluZ3MiOiJBQUFhOztBQUViO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7QUFDVDs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBOztBQUVBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQSIsInNvdXJjZXMiOlsiQzpcXFVzZXJzXFxIUFxcRGVza3RvcFxcQ2hhdWZmZXVyXFxub2RlX21vZHVsZXNcXGVyci1jb2RlXFxpbmRleC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIGFzc2lnbihvYmosIHByb3BzKSB7XG4gICAgZm9yIChjb25zdCBrZXkgaW4gcHJvcHMpIHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwga2V5LCB7XG4gICAgICAgICAgICB2YWx1ZTogcHJvcHNba2V5XSxcbiAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgICBjb25maWd1cmFibGU6IHRydWUsXG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiBvYmo7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUVycm9yKGVyciwgY29kZSwgcHJvcHMpIHtcbiAgICBpZiAoIWVyciB8fCB0eXBlb2YgZXJyID09PSAnc3RyaW5nJykge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdQbGVhc2UgcGFzcyBhbiBFcnJvciB0byBlcnItY29kZScpO1xuICAgIH1cblxuICAgIGlmICghcHJvcHMpIHtcbiAgICAgICAgcHJvcHMgPSB7fTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIGNvZGUgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHByb3BzID0gY29kZTtcbiAgICAgICAgY29kZSA9IHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBpZiAoY29kZSAhPSBudWxsKSB7XG4gICAgICAgIHByb3BzLmNvZGUgPSBjb2RlO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBhc3NpZ24oZXJyLCBwcm9wcyk7XG4gICAgfSBjYXRjaCAoXykge1xuICAgICAgICBwcm9wcy5tZXNzYWdlID0gZXJyLm1lc3NhZ2U7XG4gICAgICAgIHByb3BzLnN0YWNrID0gZXJyLnN0YWNrO1xuXG4gICAgICAgIGNvbnN0IEVyckNsYXNzID0gZnVuY3Rpb24gKCkge307XG5cbiAgICAgICAgRXJyQ2xhc3MucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShPYmplY3QuZ2V0UHJvdG90eXBlT2YoZXJyKSk7XG5cbiAgICAgICAgcmV0dXJuIGFzc2lnbihuZXcgRXJyQ2xhc3MoKSwgcHJvcHMpO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVFcnJvcjtcbiJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOlswXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/../../node_modules/err-code/index.js\n");

/***/ })

};
;