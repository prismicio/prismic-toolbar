module.exports = {
  entry: [
    'regenerator-runtime/runtime',
    'whatwg-fetch',
    'promise-polyfill/src/polyfill',
    './src/index.js',
  ],
  output: {
    filename: 'prismic-toolbar.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
    ],
  },
};
