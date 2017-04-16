/**
 * @file
 */
'use strict';

// Require Node modules and perform setup.
const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const path           = require('path');
const proxyquire     = require('proxyquire')
const sinon          = require('sinon');
const sinonChai      = require('sinon-chai');
const stream         = require('stream');
chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);

const Readable = stream.Readable;

let fsStub   = {},
    pathStub = {};

// Swap Bluebird for the native Promise object.
const Promise = require('bluebird');

// Define local constants.
const TEMPLATE_CONTENTS  = 'Hello, {{name}}';
const TEMPLATE_DIRECTORY = 'test/views';
const TEMPLATE_EXTENSION = 'hbs';
const TEMPLATE_NAME      = 'testing';
const TEMPLATE_TYPE      = 'view';

// Require module to test.
const koaRenderer = proxyquire('../../index.js', {
  'fs':   fsStub,
  'path': pathStub
});

// Describe tests.
describe('exports', function() {
  it('should return an AsyncFunction', function() {
    koaRenderer({
      paths: {
        views: TEMPLATE_DIRECTORY
      }
    }).should.be.an('AsyncFunction');
  });
});

describe('Renderer', function() {
  let renderer;

  beforeEach(function() {
    renderer = new koaRenderer.Renderer;

    fsStub.createReadStream = sinon.stub().callsFake(function(file, options) {
      let stream = new Readable;

      stream._read = function() {
        if (file !== path.join(TEMPLATE_DIRECTORY, TEMPLATE_NAME + '.' + TEMPLATE_EXTENSION)) {
          this.emit('error', new Error('Testing error'));
        } else {
          this.push(TEMPLATE_CONTENTS);
          this.push(null);
        }
      };

      return stream;
    });
    fsStub.readdir = sinon.stub().callsFake(function(directory, callback) {
      if (directory !== TEMPLATE_DIRECTORY) {
        return callback(directory);
      }

      return callback(null, [
        TEMPLATE_NAME + '.' + TEMPLATE_EXTENSION,
        'another.nope'
      ]);
    });

    pathStub.join = sinon.stub().callsFake(function() {
      return path.join.apply(path, arguments);
    });
    pathStub.normalize = sinon.stub().callsFake(function() {
      return path.normalize.apply(path, arguments);
    });
  });

  describe('constructor', function() {
    it('should create an empty template object cache', function() {
      renderer._cache.should.be.an('object');
      renderer._cache.should.have.all.keys('layout', 'partial', 'view');
    });

    it('should create a new Handlebars environment', function() {
      renderer.hbs.constructor.name.should.equal('HandlebarsEnvironment');
    });
  });

  describe('#_compileTemplate', function() {
    it('should compile the template via this.hbs.compile', function() {
      sinon.spy(renderer.hbs, 'compile');

      renderer._compileTemplate(TEMPLATE_TYPE, TEMPLATE_NAME, TEMPLATE_CONTENTS);
      renderer.hbs.compile.should.have.been.calledOnce;
      renderer.hbs.compile.should.have.been.calledWith(TEMPLATE_CONTENTS);
    });

    it('should cache the compiled template', function() {
      renderer._compileTemplate(TEMPLATE_TYPE, TEMPLATE_NAME, TEMPLATE_CONTENTS);
      renderer._cache[TEMPLATE_TYPE][TEMPLATE_NAME].should.exist;
      renderer._cache[TEMPLATE_TYPE][TEMPLATE_NAME].should.be.a('function');
    });

    it('should set the _name of the compiled template', function() {
      renderer._compileTemplate(TEMPLATE_TYPE, TEMPLATE_NAME, TEMPLATE_CONTENTS);
      renderer._cache[TEMPLATE_TYPE][TEMPLATE_NAME]._name.should.exist;
      renderer._cache[TEMPLATE_TYPE][TEMPLATE_NAME]._name.should.equal(TEMPLATE_NAME);
    });

    it('should rely on Date.now() to obtain the current time', function() {
      sinon.spy(Date, 'now');

      renderer._compileTemplate(TEMPLATE_TYPE, TEMPLATE_NAME, TEMPLATE_CONTENTS);
      Date.now.should.have.been.calledOnce;

      Date.now.restore();
    });

    it('should rely on Math.floor() to round the current time to the nearest second', function() {
      sinon.spy(Math, 'floor');

      renderer._compileTemplate(TEMPLATE_TYPE, TEMPLATE_NAME, TEMPLATE_CONTENTS);
      Math.floor.should.have.been.calledOnce;

      Math.floor.restore();
    });

    it('should set the _cached timestamp of the compiled template', function() {
      renderer._compileTemplate(TEMPLATE_TYPE, TEMPLATE_NAME, TEMPLATE_CONTENTS);
      renderer._cache[TEMPLATE_TYPE][TEMPLATE_NAME]._cached.should.exist;
      renderer._cache[TEMPLATE_TYPE][TEMPLATE_NAME]._cached.should.be.a('number');
    });

    it('should return the compiled template', function() {
      let template = renderer._compileTemplate(TEMPLATE_TYPE, TEMPLATE_NAME, TEMPLATE_CONTENTS);
      template.should.deep.equal(renderer._cache[TEMPLATE_TYPE][TEMPLATE_NAME]);
    });
  });

  describe('#_loadFile', function() {
    it('should normalize the target path via path.normalize', function() {
      let p = renderer._loadFile(TEMPLATE_DIRECTORY, TEMPLATE_NAME, TEMPLATE_EXTENSION, TEMPLATE_TYPE, 60);
      pathStub.normalize.should.have.been.calledOnce;
    });

    it('should join the specified directory, filename, and extension via path.join', function() {
      let p = renderer._loadFile(TEMPLATE_DIRECTORY, TEMPLATE_NAME, TEMPLATE_EXTENSION, TEMPLATE_TYPE, 60);
      pathStub.join.should.have.been.calledOnce;
      pathStub.join.should.have.been.calledWith(TEMPLATE_DIRECTORY, TEMPLATE_NAME + '.' + TEMPLATE_EXTENSION);
    });

    it('should return a Promise', function() {
      let p = renderer._loadFile(TEMPLATE_DIRECTORY, TEMPLATE_NAME, TEMPLATE_EXTENSION, TEMPLATE_TYPE, 60);
      p.should.be.an('object');
      p.constructor.name.should.equal('Promise');
    });

    it('should resolve to cached template if one exists and has not expired', function(done) {
      renderer._compileTemplate(TEMPLATE_TYPE, TEMPLATE_NAME, TEMPLATE_CONTENTS);

      let p = renderer._loadFile(TEMPLATE_DIRECTORY, TEMPLATE_NAME, TEMPLATE_EXTENSION, TEMPLATE_TYPE, 60);
      p.then((cached) => {
        cached.should.deep.equal(renderer._cache[TEMPLATE_TYPE][TEMPLATE_NAME]);
      });
      p.should.be.fulfilled.notify(done);
    });

    it('should create a Readable stream via fs.createReadStream', function() {
      renderer._loadFile(TEMPLATE_DIRECTORY, TEMPLATE_NAME, TEMPLATE_EXTENSION, TEMPLATE_TYPE, 60);
      fsStub.createReadStream.should.have.been.calledOnce;
    });

    it('should reject on error', function(done) {
      renderer._loadFile(TEMPLATE_DIRECTORY, 'bad', TEMPLATE_EXTENSION, TEMPLATE_TYPE, 60).should.be.rejected.notify(done);
    });

    it('should compile loaded template via this._compileTemplate', function(done) {
      sinon.spy(renderer, '_compileTemplate');
      renderer._loadFile(TEMPLATE_DIRECTORY, TEMPLATE_NAME, TEMPLATE_EXTENSION, TEMPLATE_TYPE, 60).then(function() {
        renderer._compileTemplate.should.have.been.calledOnce;
        renderer._compileTemplate.should.have.been.calledWith(TEMPLATE_TYPE, TEMPLATE_NAME, TEMPLATE_CONTENTS);
        renderer._compileTemplate.restore();
      }).should.be.fulfilled.notify(done);
    });
  });

  describe('#_loadFiles', function() {
    it('should return a promise', function() {
      let p = renderer._loadFiles(TEMPLATE_DIRECTORY, TEMPLATE_EXTENSION, TEMPLATE_TYPE, 60);
      p.should.be.an('object');
      p.constructor.name.should.equal('Promise');
    });

    it('should reject on error', function(done) {
      renderer._loadFiles('bad', TEMPLATE_EXTENSION, TEMPLATE_TYPE, 60).should.be.rejected.notify(done);
    });

    it('should call this._loadFile for each matching file in the directory', function(done) {
      sinon.spy(renderer, '_loadFile');
      renderer._loadFiles(TEMPLATE_DIRECTORY, TEMPLATE_EXTENSION, TEMPLATE_TYPE, 60).then(function() {
        renderer._loadFile.should.have.been.calledOnce;
        renderer._loadFile.restore();
      }).should.be.fulfilled.notify(done);
    });

    it('should resolve to a map of compiled templates from the cache', function(done) {
      renderer._loadFiles(TEMPLATE_DIRECTORY, TEMPLATE_EXTENSION, TEMPLATE_TYPE, 60).then(function(result) {
        result.should.be.an('object');
        renderer._cache['view'][TEMPLATE_NAME].should.deep.equal(result[TEMPLATE_NAME]);
      }).should.be.fulfilled.notify(done);
    });
  });

  describe('#_render', function() {
    let context = { value: 'context' },
        options = { value: 'options' };

    let view, layout;

    beforeEach(function() {
      view   = sinon.spy();
      layout = sinon.spy();
    });

    it('should execute a specified view template function', function() {
      renderer._render(view, layout, context, options);
      view.should.have.been.calledOnce;
      view.should.have.been.calledWith(context, options);
    });

    it('should execute a specified layout template function', function() {
      renderer._render(view, layout, context, options);
      layout.should.have.been.calledOnce;
      layout.should.have.been.calledWith(Object.assign({}, context, {
        body: view(context, options)
      }), options);
    });
  });

  describe('#middleware', function() {
    it('should return an asynchronous function', function() {
      renderer.middleware({
        paths: { views: TEMPLATE_DIRECTORY }
      }).should.be.an('AsyncFunction');
    });

    it('should throw ReferenceError if option.paths is undefined', function() {
      (function() {
        renderer.middleware();
      }).should.throw(ReferenceError);
    });

    it('should throw ReferenceError if option.paths.views is undefined', function() {
      (function() {
        renderer.middleware({
          paths: {}
        });
      }).should.throw(ReferenceError);
    });

    describe('middleware async function', function() {
      let fn, next;

      beforeEach(function() {
        fn = renderer.middleware({
          paths: { views: TEMPLATE_DIRECTORY }
        });
        next = sinon.spy();
      });

      it('should attach a render method to specified context', function() {
        let ctx = {};
        fn(ctx, next);
        ctx.render.should.exist;
        ctx.render.should.be.an('AsyncFunction');
      });

      it('should await next', function() {
        fn({}, next);
        next.should.have.been.calledOnce;
      });
    });

    describe('ctx.render', function() {
      let ctx;

      beforeEach(function() {
        ctx = {};
      });

      it('should call this._loadFile to load the specified view', function(done) {
        sinon.spy(renderer, '_loadFile');
        renderer.middleware({
          paths: { views: TEMPLATE_DIRECTORY }
        })(ctx, function() {
          Promise.resolve(ctx.render(TEMPLATE_NAME)).then(() => {
            renderer._loadFile.should.have.been.calledOnce;
            renderer._loadFile.restore();
          }).should.be.fulfilled.notify(done);
        });
      });

      it('should call this._loadFile to load the specified layout if options.paths.layouts is specified', function(done) {
        sinon.spy(renderer, '_loadFile');
        renderer.middleware({
          paths: {
            views: TEMPLATE_DIRECTORY,
            layouts: TEMPLATE_DIRECTORY
          },
          defaultLayout: 'testing'
        })(ctx, function() {
          Promise.resolve(ctx.render(TEMPLATE_NAME)).then(() => {
            renderer._loadFile.should.have.been.calledTwice;
            renderer._loadFile.restore();
          }).should.be.fulfilled.notify(done);
        });
      });

      it('should override options.defaultLayout if context.layout is specified', function(done) {
        sinon.spy(renderer, '_loadFile');
        renderer.middleware({
          paths: {
            views: TEMPLATE_DIRECTORY,
            layouts: TEMPLATE_DIRECTORY
          },
          defaultLayout: 'bad'
        })(ctx, function() {
          Promise.resolve(ctx.render(TEMPLATE_NAME, {
            layout: TEMPLATE_NAME
          })).then(() => {
            renderer._loadFile.should.have.been.calledTwice;
            renderer._loadFile.restore();
          }).should.be.fulfilled.notify(done);
        });
      });

      it('should call this._loadFiles to load the specified partials if options.paths.partials is specified', function(done) {
        sinon.spy(renderer, '_loadFiles');
        renderer.middleware({
          paths: {
            views: TEMPLATE_DIRECTORY,
            partials: TEMPLATE_DIRECTORY
          }
        })(ctx, function() {
          Promise.resolve(ctx.render(TEMPLATE_NAME)).then(() => {
            renderer._loadFiles.should.have.been.calledOnce;
            renderer._loadFiles.restore();
          }).should.be.fulfilled.notify(done);
        });
      });

      it('should set ctx.type to text/html; charset=utf-8', function(done) {
        renderer.middleware({
          paths: { views: TEMPLATE_DIRECTORY }
        })(ctx, function() {
          Promise.resolve(ctx.render(TEMPLATE_NAME)).then(() => {
            ctx.type.should.equal('text/html; charset=utf-8');
          }).should.be.fulfilled.notify(done);
        });
      });

      it('should set ctx.body to the rendered template', function(done) {
        renderer.middleware({
          paths: { views: TEMPLATE_DIRECTORY }
        })(ctx, function() {
          Promise.resolve(ctx.render(TEMPLATE_NAME, {
            name: 'test'
          })).then(() => {
            ctx.body.should.be.a('string');
            ctx.body.should.equal('Hello, test');
          }).should.be.fulfilled.notify(done);
        });
      });
    });
  });
});
