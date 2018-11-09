const webpack = require('webpack');
const cssnano = require('cssnano');
const postcssUrl = require('postcss-url');
const postcssEasyImport = require('postcss-easy-import');
const postcssPresetEnv = require('postcss-preset-env');
const { WebPlugin } = require('web-webpack-plugin');

// Make relative path
const relative = path => require('path').resolve(__dirname, path);

// Prepare syntax for IE
const entry = path => ['promise-polyfill/src/polyfill', 'regenerator-runtime/runtime', relative(path)];

module.exports = (_, argv) => {

  const dev = argv.mode === 'development'

  return {
    // Minimal console output
    stats: 'minimal',

    // Source maps
    devtool: dev ? 'inline-cheap-module-source-map' : false,

    // Don't watch node_modules
    watchOptions: { ignored: '/node_modules/' },

    // Output to prismic app
    output: { path: relative('../../app/assets/javascripts/toolbar') },

    // Toolbar & iFrame
    entry: {
      iframe: entry('src/iframe'),
      toolbar: entry('src/toolbar'),
    },

    // Helper Functions
    resolve: { alias: { common: relative('src/common') } },

    plugins: [
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