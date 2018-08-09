const webpack = require('webpack');
const cssnano = require('cssnano');
const postcssUrl = require('postcss-url');
const postcssEasyImport = require('postcss-easy-import');
const postcssPresetEnv = require('postcss-preset-env');

const resolve = path => require('path').resolve(__dirname, path);
const polyfill = path => [resolve('polyfill'), resolve(path)];

const dev = process.env.WEBPACK_SERVE;

module.exports = {
  mode: dev ? 'development' : 'production',

  devtool: dev ? 'cheap-source-map' : false,

  watchOptions: {
    ignored: '/node_modules/',
  },

  output: {
    path: resolve('../../app/assets/javascripts/toolbar'),
  },

  // Toolbar & iFrame
  entry: {
    iframe: polyfill('src/iframe'),
    toolbar: polyfill('src/toolbar'),
  },

  // Helper Functions
  resolve: {
    alias: {
      common: resolve('src/common'),
    },
  },

  // Expose environment variables
  plugins: [new webpack.EnvironmentPlugin(['npm_package_version'])],

  module: {
    rules: [
      // PostCSS
      {
        test: /\.css$/,
        use: [
          'raw-loader',
          {
            loader: 'postcss-loader',
            options: {
              sourceMap: 'inline',
              plugins: () => [
                postcssEasyImport(),
                postcssUrl({ url: 'inline' }),
                postcssPresetEnv({
                  features: {
                    'nesting-rules': true,
                    'color-mod-function': true,
                  },
                }),
                cssnano(),
              ],
            },
          },
        ],
      },

      // Babel
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },

      // DataURI Image Loader
      {
        test: /\.(svg|jpg)$/,
        use: 'url-loader',
      },
    ],
  },
};
