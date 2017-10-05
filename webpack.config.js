/* eslint-env node */

const webpack = require('webpack');

module.exports = {
  entry: {
    npm: ['whatwg-fetch', './src/index.js'],
    script: ['whatwg-fetch', './src/browser.js'],
  },
  devtool: 'source-map',
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
