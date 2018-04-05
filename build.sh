#!/bin/bash

./node_modules/.bin/webpack --mode development
./node_modules/.bin/uglifyjs ./dist/prismic-toolbar.js -c -m -o ./dist/prismic-toolbar.min.js --source-map ./dist/prismic-toolbar.min.js.map
