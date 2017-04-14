#!/bin/bash

webpack
node_modules/uglify-js/bin/uglifyjs ./dist/script-prismic-toolbar.js -c -m -o ./dist/prismic-toolbar.min.js --source-map ./dist/prismic-toolbar.min.js.map
