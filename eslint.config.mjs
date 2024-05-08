import globals from "globals";
import pluginJs from "@eslint/js";


export default [
  pluginJs.configs.recommended,
  {
    languageOptions: {
      globals: Object.assign({}, globals.browser, globals.webextensions)
    }
  },
  {
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "require-await": ["warn"],
      "func-style": ["error", "declaration", { "allowArrowFunctions": true }],
      "no-use-before-define": ["error", { "functions": false }],
      // "prefer-const": ["warn"],
      // "no-magic-numbers": ["warn", { "ignore": [-1, 0, 1] }],
      // "block-scoped-var": ["warn"],
      // "consistent-return": ["warn"],
      "one-var": ["warn", { "uninitialized": "consecutive" }],
      "no-shadow": ["warn", { "builtinGlobals": true }]
    }
  }
];