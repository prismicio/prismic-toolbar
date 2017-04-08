/* eslint-env node */

const webpack = require('webpack');

module.exports = {
  entry: {
    npm: ['whatwg-fetch', 'babel-polyfill', './src/index.js'],
    script: ['whatwg-fetch', 'babel-polyfill', './src/browser.js'],
  },
  devtool: 'source-map',
  output: {
    filename: './dist/[name]-prismic-toolbar.js',
    libraryTarget: 'commonjs',
  },
  resolve: {
    extensions: ['.js'],
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        use: ['source-map-loader'],
        enforce: 'pre',
      },
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['env'],
          },
        },
      },
    ],
  },
  plugins: [
    new webpack.NoEmitOnErrorsPlugin(),
  ],
};
