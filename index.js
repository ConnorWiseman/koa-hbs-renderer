/**
 * @file
 */
'use strict';

// Required Node.js modules.
const fs         = require('fs');
const Handlebars = require('handlebars');
const path       = require('path');

// Swap Bluebird for the native Promise object.
const Promise = require('bluebird');

// Declare local constants.
const emptyLayout = Handlebars.compile('{{{body}}}');


/**
 * @param  {Object} options
 * @return {AsyncFunction}
 */
module.exports = function(options) {
  let renderer = new Renderer;

  return renderer.middleware(options);
};


/**
 * @class
 */
let Renderer = module.exports.Renderer = class Renderer {


  /**
   * @constructor
   */
  constructor() {
    this._cache = {
      layout:  {},
      partial: {},
      view:    {}
    };

    this.hbs = Handlebars.create();
  }


  /**
   * @param  {String} type
   * @param  {String} name
   * @param  {String} contents
   * @return {Function}
   * @private
   */
  _compileTemplate(type, name, contents) {
    this._cache[type][name] = this.hbs.compile(contents);

    this._cache[type][name]._name   = name;
    this._cache[type][name]._cached = Math.floor(Date.now() / 1000);

    return this._cache[type][name];
  }


  /**
   * @param  {String} directory The directory to retrieve the file from.
   * @param  {String} filename  The name of the file to retrieve.
   * @param  {String} extension A file extension without the leading period.
   * @param  {String} type      One of either 'layout', 'partial', or 'view'.
   * @param  {Number} expires   The maximum time in seconds to cache templates.
   * @return {Promise}
   * @private
   */
  _loadFile(directory, filename, extension, type, expires) {
    let file = path.normalize(path.join(directory, `${filename}.${extension}`)),
        now  = Math.floor(Date.now() / 1000),
        raw;

    return new Promise((resolve, reject) => {
      if (this._cache[type][filename] !== undefined &&
          this._cache[type][filename]._cached + expires > now) {
        return resolve(this._cache[type][filename]);
      }

      raw = '';

      fs.createReadStream(file, { encoding: 'utf-8' }).on('data', chunk => {
        raw += chunk;
      }).on('error', error => {
        reject(error);
      }).on('end', () => {
        resolve(this._compileTemplate(type, filename, raw));
      });
    });
  }


  /**
   * @param  {String} directory The directory to retrieve the files from.
   * @param  {String} extension A file extension without the leading period.
   * @param  {String} type      One of either 'layout', 'partial', or 'view'.
   * @param  {Number} expires   The maximum time in seconds to cache templates.
   * @return {Promise}
   * @private
   */
  _loadFiles(directory, extension, type, expires) {
    return new Promise((resolve, reject) => {
      let files = [];

      fs.readdir(directory, (error, list) => {
        if (error) {
          return reject(error);
        }

        for (let i = 0; i < list.length; i++) {
          let parts = list[i].split('.'),
              file  = parts[0],
              ext   = parts[1];

          if (ext === extension) {
            files.push(this._loadFile(directory, file, extension, type, expires));
          }
        }

        resolve(Promise.all(files));
      });
    }).then(files => {
      let map = {};

      for (let i = 0; i < files.length; i++) {
        map[files[i]._name] = files[i];
      }

      return map;
    });
  }


  /**
   * @param  {Function} view
   * @param  {Function} layout
   * @param  {Object}   context
   * @param  {Object}   options
   * @return {String}
   * @private
   */
  _render(view, layout, context, options) {
    return layout(Object.assign({}, context, {
      body: view(context, options)
    }), options);
  }


  /**
   * @param  {Object} options
   * @return {AsyncFunction}
   * @throws {ReferenceError}
   * @public
   */
  middleware(options) {
    let opts = Object.assign({
      defaultLayout: 'default',
      expires:       60,
      extension:     'hbs',
    }, options);

    if (opts.paths === undefined) {
      throw new ReferenceError('options.paths is undefined');
    } else if (opts.paths.views === undefined) {
      throw new ReferenceError('options.paths.views is required');
    }

    opts.extension = opts.extension.replace(/[^a-z-]/, '');

    /**
     * @param {Object}   ctx
     * @param {Function} next
     */
    return async (ctx, next) => {

      /**
       * @param {String} view
       * @param {Object} [locals]
       */
      ctx.render = async (view, locals) => {
        let context = Object.assign({}, ctx.state, locals),
            options = {},
            viewTemplate   = await this._loadFile(opts.paths.views, view, opts.extension, 'view', opts.expires),
            layoutTemplate = emptyLayout;

        if (opts.paths.layouts !== undefined) {
          layoutTemplate = await this._loadFile(opts.paths.layouts, context.layout || opts.defaultLayout, opts.extension, 'layout', opts.expires);
        }

        if (opts.paths.partials !== undefined) {
          options = Object.assign(options, {
            partials: await this._loadFiles(opts.paths.partials, opts.extension, 'partial', opts.expires)
          });
        }

        ctx.type = 'text/html; charset=utf-8';
        ctx.body = this._render(viewTemplate, layoutTemplate, context, options);
      };

      await next();
    }
  }
};
