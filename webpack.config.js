const webpack = require('webpack');

module.exports = {
  entry: ['babel-regenerator-runtime', './src/index.js'],
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
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          },
        },
      },
    ],
  },
};
