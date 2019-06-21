const webpack = require('webpack');
const cssnano = require('cssnano');
const postcssUrl = require('postcss-url');
const postcssEasyImport = require('postcss-easy-import');
const postcssPresetEnv = require('postcss-preset-env');
const { WebPlugin } = require('web-webpack-plugin');
const SuppressChunksPlugin = require('suppress-chunks-webpack-plugin').default;
const applicationMode = require('./application-mode');

// Make relative path
const relative = path => require('path').resolve(__dirname, path);

module.exports = (_, options) => {

  const dev = !options || options.mode === applicationMode.DEV;

  return {
    // Minimal console output
    stats: 'minimal',

    // Source maps
    devtool: dev ? 'inline-cheap-module-source-map' : false,

    // Webpack scope hoisting is broken
    optimization: { concatenateModules: false },

    // Don't watch node_modules
    watchOptions: { ignored: '/node_modules/' },

    // Output to prismic app
    output: { path: relative('build') },

    // Toolbar & iFrame
    entry: {
      iframe: relative('src/iframe'),
      prismic: relative('src/toolbar'),
    },

    // Helper Functions
    resolve: {
      alias: {
        '~': relative('src'),
        '@common': relative('src/common'),
        '@toolbar': relative('src/toolbar'),
        '@iframe': relative('src/iframe'),
        '@toolbar-service': relative('src/toolbar-service'),
        react: 'preact-compat',
        'react-dom': 'preact-compat',
      }
    },
    plugins: [
      // Ensure working regenerator-runtime
      new webpack.ProvidePlugin({
        // Promise: 'es6-promise', // Remember to build with a promise polyfill for IE
        regeneratorRuntime: 'regenerator-runtime',
        h: ['preact', 'h'],
      }),
      // Expose environment variables
      new webpack.EnvironmentPlugin(['npm_package_version']),
      // Output HTML for iFrame
      new WebPlugin({
        filename: 'iframe.html',
        template: relative('src/iframe/index.html'),
      }),
      new SuppressChunksPlugin(['iframe']),
    ],

    module: {
      rules: [
        {
          test: /\.css$/,
          use: [
            // `import foo.css` gets the raw text to inject anywhere
            'raw-loader',
            {
              // PostCSS
              loader: 'postcss-loader',
              options: {
                sourceMap: 'inline',
                plugins: _ => [
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

        // ESLint
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: ['eslint-loader']
        },

        // DataURI Image Loader
        {
          test: /\.(svg|jpg)$/,
          use: 'url-loader',
        },
      ],
    },
  }
};
