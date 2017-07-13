# koa-hbs-renderer

[![npm](https://img.shields.io/npm/v/koa-hbs-renderer.svg?style=flat-square)](https://www.npmjs.com/package/koa-hbs-renderer) [![Build Status](https://img.shields.io/travis/ConnorWiseman/koa-hbs-renderer/master.svg?style=flat-square)](https://travis-ci.org/ConnorWiseman/koa-hbs-renderer) [![Coverage](https://img.shields.io/codecov/c/github/ConnorWiseman/koa-hbs-renderer.svg?style=flat-square)](https://codecov.io/gh/ConnorWiseman/koa-hbs-renderer)
[![Dependencies Status](https://david-dm.org/ConnorWiseman/koa-hbs-renderer/status.svg?style=flat-square)](https://david-dm.org/ConnorWiseman/koa-hbs-renderer)
[![devDependencies Status](https://david-dm.org/ConnorWiseman/koa-hbs-renderer/dev-status.svg?style=flat-square)](https://david-dm.org/ConnorWiseman/koa-hbs-renderer?type=dev)
[![MIT licensed](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](https://github.com/ConnorWiseman/koa-hbs-renderer/blob/master/LICENSE)

A Handlebars template renderer for Koa2.


## Installation

```shell
npm install --save koa-hbs-renderer
```


## Usage
### views/template.hbs
```html
<p>This is a template. Isn't that {{adjective}}?</p>
```

### index.js
```javascript
const Koa      = require('koa');
const path     = require('path');
const renderer = require('koa-hbs-renderer');

let app = new Koa();

app.use(renderer({
  paths: {
    views: path.join(__dirname, 'views')
  }
}));

app.use(async (ctx, next) => {
  await ctx.render('template', {
    adjective: 'useful'
  });
});

app.listen(3000);
```

## Options
### defaultLayout
The name of the layout to use by default if `paths.layouts` is defined. Defaults to `default`.

### expires
The length of time, in seconds, to keep compiled Handlebars templates in the in-memory cache. Defaults to `60`.

### extension
The file extension used by template files. Defaults to `hbs`.

### paths
An object literal of specified file paths. _Required._

#### views
The path to a directory of view templates. _Required._

#### partials
The path to a directory of partial templates. If specified, all templates in the partials directory will be compiled and cached together. _Optional._

#### helpers
The path to a directory of helper functions contained in JavaScript files. If specified, all functions in the helpers directory will be loaded and  made available to the Handlebars environment for rendering. _Optional._

#### layouts
The path to a directory of layout templates. _Optional._
