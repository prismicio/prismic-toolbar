module.exports = {
  parser: 'babel-eslint',
  extends: ['airbnb-base'],
  env: {
    browser: true,
    jest: true,
  },
  rules: {
    'func-names': 0,
    'space-before-function-paren': 0,
    'no-param-reassign': 0,
    'no-return-assign': [2, 'except-parens'],
    'no-use-before-define': 0,
    'consistent-return': 0,
    'no-prototype-builtins': 0,
    'arrow-parens': [2, 'as-needed'],
    'no-console': [2, { allow: ['warn', 'error'] }],
  },
};
