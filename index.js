/**
 * @file
 */
'use strict';


const fs         = require('fs');
const Handlebars = require('handlebars');
const path       = require('path');
const Promise    = require('bluebird');


const emptyLayout = Handlebars.compile('{{{body}}}');


/**
 * @param  {Object} [options]
 * @return {AsyncFunction}
 */
module.exports = function createRendererMiddleware(options) {
  let opts = Object.assign({
    defaultLayout: 'default',
    expires:       60,
    extension:     '.hbs',
  }, options);

  if (!opts.paths) {
    throw new ReferenceError('options.paths is required');
  } else if (!opts.paths.views) {
    throw new ReferenceError('options.paths.views is required');
  }

  opts.extension = `.${opts.extension.replace(/[^a-z-]/, '')}`;

  let cache = {
    layout:  {},
    partial: {},
    view:    {}
  };

  let hbs = Handlebars.create();

  if (opts.paths.helpers !== undefined) {
    let helpers = fs.readdirSync(opts.paths.helpers);

    for (let helper of helpers) {
      const helperPath    = path.join(opts.paths.helpers, helper);
      const { name, ext } = path.parse(helper);

      if (ext === '.js') {
        hbs.registerHelper(name, require(helperPath));
      }
    }
  }


  /**
   * Compiles the specified template with the local Handlebars environment.
   * @param  {String} type
   * @param  {String} name
   * @param  {String} contents
   * @return {Function}
   * @private
   */
  function compileTemplate(type, name, contents) {
    cache[type][name] = hbs.compile(contents);
    cache[type][name]._name   = name;
    cache[type][name]._cached = Math.floor(Date.now() / 1000);
    return cache[type][name];
  };


  /**
   * @param  {String} directory The directory to retrieve the file from.
   * @param  {String} filename  The name of the file to retrieve.
   * @param  {String} type      One of either 'layout', 'partial', or 'view'.
   * @return {Promise}
   * @private
   */
  function loadFile(directory, filename, type) {
    let file = path.join(directory, `${filename}${opts.extension}`),
        now  = Math.floor(Date.now() / 1000),
        raw;

    return new Promise(function(resolve, reject) {
      if (cache[type][filename] !== undefined &&
          cache[type][filename]._cached + opts.expires > now) {
        return resolve(cache[type][filename]);
      }

      raw = '';

      fs.createReadStream(file, { encoding: 'utf-8' }).on('data', chunk => {
        raw += chunk;
      }).on('error', error => {
        reject(error);
      }).on('end', () => {
        resolve(compileTemplate(type, filename, raw));
      });
    });
  };


  /**
   * @param  {String} directory The directory to retrieve the files from.
   * @param  {String} type      One of either 'layout', 'partial', or 'view'.
   * @return {Promise}
   * @private
   */
  function loadFiles(directory, type) {
    return new Promise(function(resolve, reject) {
      let files = [];

      fs.readdir(directory, function(error, list) {
        if (error) {
          return reject(error);
        }

        for (let file of list) {
          const { name, ext } = path.parse(file);

          if (ext === opts.extension) {
            files.push(loadFile(directory, name, type));
          }
        }

        resolve(Promise.all(files));
      });
    }).then(function(files) {
      return files.reduce(function(map, current) {
        map[current._name] = current;
        return map;
      }, {});
    });
  };


  /**
   * @param  {Function} view
   * @param  {Function} layout
   * @param  {Object}   context
   * @param  {Object}   options
   * @return {String}
   * @private
   */
  function renderView(view, layout, context, options) {
    return layout(Object.assign({}, context, {
      body: view(context, options)
    }), options);
  };


  /**
   * @param {Object}   ctx
   * @param {Function} next
   */
  return async function rendererMiddleware(ctx, next) {


    /**
     * @param {String} view
     * @param {Object} [locals]
     */
    ctx.render = async function render(view, locals) {
      let context = Object.assign({}, ctx.state, locals),
          options = {},
          viewTemplate   = await loadFile(opts.paths.views, view, 'view'),
          layoutTemplate = emptyLayout;

      if (opts.paths.layouts !== undefined) {
        layoutTemplate = await loadFile(opts.paths.layouts, context.layout || opts.defaultLayout, 'layout');
      }

      if (opts.paths.partials !== undefined) {
        options = Object.assign(options, {
          partials: await loadFiles(opts.paths.partials, 'partial')
        });
      }

      ctx.type = 'text/html; charset=utf-8';
      ctx.body = renderView(viewTemplate, layoutTemplate, context, options);
    };

    await next();
  };
};
