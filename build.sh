#!/bin/bash

webpack
node_modules/uglify-js/bin/uglifyjs ./dist/script-prismic-toolbar.js -c -m -o ./dist/script-prismic-toolbar.min.js --source-map ./dist/browser-prismic-toolbar.min.js.map
