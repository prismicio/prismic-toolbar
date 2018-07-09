const webpack = require('webpack');

const resolve = path => require('path').resolve(__dirname, path);

module.exports = env => {
  const prod = env.mode === 'production';

  return {
    output: {
      filename: prod ? '[name].min.js' : '[name].js',
    },

    entry: {
      toolbar: resolve('src/toolbar'),
      bootstrap: resolve('src/bootstrap'),
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
  };
};
