const webpack = require('webpack');

const resolve = path => require('path').resolve(__dirname, path);

module.exports = env => ({
  output: {
    filename: '[name].js',
  },

  entry: {
    toolbar: resolve('src/toolbar'),
    bootstrap: resolve('src/bootstrap'),
    'bootstrap-iframe': resolve('src/bootstrap-iframe'),
  },

  resolve: {
    alias: {
      common: resolve('src/common'),
    },
  },

  plugins: [new webpack.EnvironmentPlugin(['npm_package_version'])],

  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: 'babel-loader',
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
});
