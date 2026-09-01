const js = require("@eslint/js")
const react = require("eslint-plugin-react")
const prettierConfig = require("eslint-config-prettier")
const globals = require("globals")

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2019,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
        ...globals.es2017,
      },
    },
  },
  {
    files: ["example/src/**/*.js"],
    ...react.configs.flat.recommended,
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      ecmaVersion: 2019,
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2017,
        ...globals.browser,
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      "react/prop-types": "off",
      "react/display-name": "off",
    },
  },
  prettierConfig,
]
