/**
 * @file
 */

const fs = require('fs');
const Handlebars = require('handlebars');
const path = require('path');

const emptyLayout = Handlebars.compile('{{{body}}}');


/**
 * @param  {Object} [options] the options sent into our module
 * @return {AsyncFunction} returns the async next function
 */
module.exports = function(options) {
  let opts = Object.assign({
    defaultLayout: 'default',
    expires: 60,
    extension: '.hbs'
  }, options);

  if (!opts.paths) {
    throw new ReferenceError('options.paths is required');
  } else if (!opts.paths.views) {
    throw new ReferenceError('options.paths.views is required');
  }

  opts.extension = `.${opts.extension.replace(/[^a-z-]/, '')}`;

  let cache = {
    layout: {},
    partial: {},
    view: {}
  };
  let hbs = Handlebars.create();

  const loadPartials = function() {
    if (opts.paths.partials) {
      fs.readdir(opts.paths.partials, (err, partialList) => {
        if (err) {
          throw new Error(err);
        }

        partialList.forEach((currPartial) => {
          const { name, ext } = path.parse(currPartial);

          if (ext === opts.extension) {
            hbs.registerPartial(name, fs.readFileSync(path.join(opts.paths.partials, currPartial), 'utf-8'));
          }
        });
      });
    }
  };

  const loadHelpers = function() {
    if (opts.paths.helpers) {
      fs.readdirSync(opts.paths.helpers).forEach(currHelper => {
        const helperPath = path.join(opts.paths.helpers, currHelper);
        const { name, ext } = path.parse(currHelper);

        if (ext === '.js') {
          hbs.registerHelper(name, require(helperPath));
        }
      });
    }
  };

  loadHelpers();
  loadPartials();

  /**
   * Compiles the specified template with the local Handlebars environment.
   * @param  {String} type the current type of the piece we are working with
   * @param  {String} name the name of the current template
   * @param  {String} contents the contents of the current template
   * @return {Function} returns the render function of the compiled hbs teamplate
   * @private
   */
  const compileTemplate = function(type, name, contents) {
    cache[type][name] = hbs.compile(contents);
    cache[type][name].name = name;
    cache[type][name].cached = Math.floor(Date.now() / 1000);

    return cache[type][name];
  };


  /**
   * @param  {String} directory The directory to retrieve the file from.
   * @param  {String} filename  The name of the file to retrieve.
   * @param  {String} type      One of either 'layout', 'partial', or 'view'.
   * @return {Function} returns the promise function
   * @private
   */
  const loadFile = function(directory, filename, type) {
    return new Promise((resolve, reject) => {
      let now = Math.floor(Date.now() / 1000);
      let file = path.join(directory, `${filename}${opts.extension}`);

      if (cache[type][filename] &&
          cache[type][filename].cached + opts.expires > now) {
        return resolve(cache[type][filename]);
      }

      let raw = '';

      return fs.createReadStream(file, { encoding: 'utf-8' }).on('data', chunk => {
        raw += chunk;
      }).on('error', error => {
        return reject(error);
      }).on('end', () => {
        return resolve(compileTemplate(type, filename, raw));
      });
    });
  };

  /**
   * @param  {Function}  view the view template function
   * @param  {Function}  layout the layout template function
   * @param  {Object}   context the object containing the data for the view template
   * @param  {Object}   viewOpts options to apply to the view
   * @return {String} returns the html string
   * @private
   */
  const renderView = function(view, layout, context) {
    return layout(Object.assign({}, context, {
      body: view(context)
    }));
  };


  /**
   * @param {Object}   ctx koa context
   * @param {Function} next koa next function
   * @return {Function} returns the next callback
   */
  return async (ctx, next) => {


    /**
     * @param {String} view the string for the view template
     * @param {Object} [locals] the template context
     * @return {Undefined} does not return anything
     * @public
     */
    ctx.render = async function(view, locals) {
      let context = Object.assign({}, ctx.state, locals);
      let viewTemplate = await loadFile(opts.paths.views, view, 'view');
      let layoutTemplate = emptyLayout;

      if (opts.paths.layouts) {
        layoutTemplate = await loadFile(opts.paths.layouts, context.layout || opts.defaultLayout, 'layout');
      }

      ctx.type = 'text/html; charset=utf-8';
      ctx.body = renderView(viewTemplate, layoutTemplate, context);
    };

    await next();
  };
};
