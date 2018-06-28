module.exports = {
  presets: [
    '@babel/preset-env',
    '@babel/preset-react',
    ['@babel/preset-stage-2', { decoratorsLegacy: true }],
  ],
  plugins: [['@babel/plugin-transform-react-jsx', { pragma: 'h' }]],
};
