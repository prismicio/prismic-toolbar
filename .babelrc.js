module.exports = {
  presets: ['@babel/preset-env', '@babel/preset-react'],
  plugins: [
    // Preact
    ['@babel/plugin-transform-react-jsx', { pragma: 'h' }],

    // Stage 2
    '@babel/plugin-proposal-export-namespace-from',
    '@babel/plugin-proposal-numeric-separator',
    '@babel/plugin-proposal-throw-expressions',

    // Stage 3
    '@babel/plugin-syntax-dynamic-import',
    ['@babel/plugin-proposal-class-properties', { loose: false }],
    '@babel/plugin-proposal-json-strings',
  ],
};
