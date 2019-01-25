const webpack = require('webpack');
const { WebPlugin } = require('web-webpack-plugin');
const SuppressChunksPlugin = require('suppress-chunks-webpack-plugin').default;

// Make relative path
const relative = path => require('path').resolve(__dirname, path);

module.exports = {
  entry: {
    prismic: './src/index.js',
  },

  output: {
    path: relative('build')
  },

  plugins: [
    new webpack.ProvidePlugin({
      regeneratorRuntime: 'regenerator-runtime',
    }),
    new WebPlugin({
      filename: 'iframe.html',
      template: relative('src/iframe/index.html'),
    }),
    new SuppressChunksPlugin(['iframe']),
  ],

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
};
