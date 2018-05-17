const { WebPlugin } = require('web-webpack-plugin');

module.exports = {
	output: {
		filename: '[name].js',
	},

	entry: {
		bootstrap: './src/bootstrap/index.js',
    'bootstrap-iframe': './src/bootstrap-iframe/index.js',
		toolbar: './src/toolbar/index.js',
	},

	plugins: [
		new WebPlugin({
			filename: 'bootstrap-iframe.html',
			requires: ['bootstrap-iframe'],
		}),
	],

};
