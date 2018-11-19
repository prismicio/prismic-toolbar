const webpack = require('webpack');
const cssnano = require('cssnano');
const postcssUrl = require('postcss-url');
const postcssEasyImport = require('postcss-easy-import');
const postcssPresetEnv = require('postcss-preset-env');
const { WebPlugin } = require('web-webpack-plugin');

// Make relative path
const relative = path => require('path').resolve(__dirname, path);

module.exports = (_, { mode }) => {

  const dev = mode === 'development';

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
    output: { path: relative('../../app/assets/javascripts/toolbar') },

    // Toolbar & iFrame
    entry: {
      iframe: relative('src/iframe'),
      toolbar: relative('src/toolbar'),
    },

    // Helper Functions
    resolve: { alias:{
      common: relative('src/common'),
      common: relative('src/common'),
      'react': 'preact-compat',
      'react-dom': 'preact-compat',
    } },

    plugins: [
      // Ensure working regenerator-runtime
      new webpack.ProvidePlugin({
        Promise: 'bluebird', // Remember to build with a promise polyfill for IE
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

        // DataURI Image Loader
        {
          test: /\.(svg|jpg)$/,
          use: 'url-loader',
        },
      ],
    },
  }
};
