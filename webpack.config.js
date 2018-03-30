/* eslint-env node */

const webpack = require('webpack');

module.exports = {
  entry: ['whatwg-fetch', 'promise-polyfill/src/polyfill', './src/index.js'],
  output: {
    filename: 'prismic-toolbar.js',
    libraryTarget: 'umd',
    library: 'PrismicToolbar',
    umdNamedDefine: true,
  },
  resolve: {
    extensions: ['.js'],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['env'],
            plugins: ['transform-runtime'],
          },
        },
      },
    ],
  },
  plugins: [
    new webpack.NoEmitOnErrorsPlugin(),
  ],
};
