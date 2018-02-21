/* eslint-env node */

const webpack = require('webpack');

module.exports = {
  entry: {
    npm: ['whatwg-fetch', './src/index.js'],
    script: ['whatwg-fetch', './src/browser.js'],
  },
  output: {
    filename: './dist/[name]-prismic-toolbar.js',
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
