const path = require('path');

module.exports = {
  parser: 'babel-eslint',
  extends: ['standard', 'standard-preact', 'airbnb-base'],
  env: {
    browser: true,
    jest: true,
  },
  rules: {
    'no-unused-expressions': 0,
    'prefer-template': 0,
    'no-confusing-arrow': 0,
    'import/no-cycle': 0, // maybe revert this one (config-experiment, panel-children)
    'no-await-in-loop': 0,
    'promise/param-names': 0,
    'class-methods-use-this': 0,
    'func-names': 0,
    "global-require": 0,
    'no-new': 0,
    'no-multi-assign': 0,
    'space-before-function-paren': 0,
    'function-paren-newline': 0,
    'no-param-reassign': 0,
    'no-return-assign': [2, 'except-parens'],
    'no-use-before-define': 0,
    'consistent-return': 0,
    'no-prototype-builtins': 0,
    'arrow-parens': [2, 'as-needed'],
    'no-console': [2, { allow: ['warn', 'error'] }],
    'prefer-rest-params': 0,
    'nonblock-statement-body-position': 0,
    'no-underscore-dangle': 0,
    'comma-dangle': [
      'error',
      {
        arrays: 'only-multiline',
        objects: 'only-multiline',
        imports: 'only-multiline',
        exports: 'only-multiline',
        functions: 'ignore',
      },
    ],
    'import/prefer-default-export': 0,
    'import/no-extraneous-dependencies': 0,
    'object-curly-newline': 0,
    'implicit-arrow-linebreak': 0,
    curly: 0,
  },
  "settings": {
    "import/resolver": {
      webpack: {
        config: 'webpack.config.js'
      }
    }
  }
};
