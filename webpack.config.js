const { WebPlugin } = require('web-webpack-plugin');
const SuppressChunksPlugin = require('suppress-chunks-webpack-plugin').default;

// Make relative path
const relative = path => require('path').resolve(__dirname, path);

const deps = ['regenerator-runtime/runtime', 'whatwg-fetch', 'promise-polyfill/src/polyfill'];

module.exports = {
  entry: {
    prismic: [...deps, './src/index.js'],
    iframe: [...deps, './src/iframe/toolbar.js']
  },

  output: {
    path: relative('build')
  },

  plugins: [
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
