/**
 * @file
 */
'use strict';


const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const path           = require('path');
const Promise        = require('bluebird');
const proxyquire     = require('proxyquire').noPreserveCache();
const should         = chai.should();
const sinon          = require('sinon');
const sinonChai      = require('sinon-chai');
const Readable       = require('stream').Readable;


chai.use(chaiAsPromised);
chai.use(sinonChai);


const TEMPLATE_CONTENTS  = 'Hello, {{name}}';
const TEMPLATE_DIRECTORY = 'test/views';
const HELPER_DIRECTORY   = path.join(__dirname, '../helpers');
const HELPER_NAME        = 'double.js';
const TEMPLATE_EXTENSION = '.hbs';
const TEMPLATE_NAME      = 'testing';
const TEMPLATE_TYPE      = 'view';


let fs         = {},
    Handlebars = {};


const renderer = proxyquire('../../index.js', {
  'fs':         fs,
  'handlebars': Handlebars
});


fs.createReadStream = sinon.stub().callsFake(function(file, options) {
  let stream = new Readable;

  stream._read = function() {
    if (file !== path.join(TEMPLATE_DIRECTORY, TEMPLATE_NAME + TEMPLATE_EXTENSION)) {
      this.emit('error', new Error('Testing error'));
    } else {
      this.push(TEMPLATE_CONTENTS);
      this.push(null);
    }
  };

  return stream;
});

fs.readdir = sinon.stub().callsFake(function(directory, callback) {
  if (directory !== TEMPLATE_DIRECTORY) {
    return callback(directory);
  }

  return callback(null, [
    TEMPLATE_NAME + TEMPLATE_EXTENSION,
    'another.nope'
  ]);
});

fs.readdirSync = sinon.stub().callsFake(function(directory, callback) {
  if (directory !== HELPER_DIRECTORY) {
    return directory;
  }

  return [
    HELPER_NAME,
    'ignore.txt'
  ];
});


describe('exports', function() {
  it('should return a Function', function() {
    renderer.should.be.a('Function');
  });
});


describe('createRendererMiddleware', function() {
  afterEach(function() {
    fs.createReadStream.resetHistory();
    fs.readdir.resetHistory();
    fs.readdirSync.resetHistory();
  });

  it('should throw `ReferenceError` if `options.paths` is undefined', function() {
    (function() {
      renderer();
    }).should.throw(ReferenceError);

    (function() {
      renderer(null);
    }).should.throw(ReferenceError);

    (function() {
      renderer(undefined);
    }).should.throw(ReferenceError);
  });

  it('should throw `ReferenceError` if `options.paths.views` is undefined', function() {
    (function() {
      renderer({ paths: {} });
    }).should.throw(ReferenceError);

    (function() {
      renderer({ paths: null });
    }).should.throw(ReferenceError);

    (function() {
      renderer({ paths: undefined });
    }).should.throw(ReferenceError);
  });

  it('should create a new Handlebars environment', function() {
    sinon.spy(Handlebars, 'create');

    renderer({
      paths: { views: TEMPLATE_DIRECTORY }
    });

    Handlebars.create.should.have.been.calledOnce;
    Handlebars.create.restore();
  });

  it('should properly format specified `extension`', function() {
    renderer({
      paths: { views: TEMPLATE_DIRECTORY },
      extension: 'hbs'
    });
  });

  it('should load helper functions is `options.paths.helpers` is defined', function() {
    renderer({
      paths: {
        views:   TEMPLATE_DIRECTORY,
        helpers: HELPER_DIRECTORY
      }
    });

    fs.readdirSync.should.have.been.calledOnce;
  });

  it('should return `AsyncFunction`', function() {
    let r = renderer({
      paths: { views: TEMPLATE_DIRECTORY }
    });

    r.should.be.a('Function');
    r.constructor.name.should.equal('AsyncFunction');
  });


  describe('rendererMiddleware', function() {
    var fn, next;

    beforeEach(function() {
      fn = renderer({
        paths: { views: TEMPLATE_DIRECTORY }
      });
      next = sinon.spy();
    });

    it('should attach `render` async method to Koa context', function() {
      let ctx = {};
      fn(ctx, next);
      ctx.render.should.exist;
      ctx.render.should.be.a('Function');
      ctx.render.constructor.name.should.equal('AsyncFunction');
    });

    it('should await `next`', function() {
      fn({}, next);
      next.should.have.been.calledOnce;
    });
  });


  describe('ctx.render', function() {
    var ctx, r;

    beforeEach(function() {
      ctx = {};
    });

    it('should load the specified view', function(done) {
      renderer({
        paths: { views: TEMPLATE_DIRECTORY }
      })(ctx, async function() {
        await ctx.render(TEMPLATE_NAME);
        fs.createReadStream.should.have.been.calledOnce;
      }).should.be.fulfilled.notify(done);
    });

    it('should load the specified view from the cache if it exists', function(done) {
      renderer({
        paths: { views: TEMPLATE_DIRECTORY }
      })(ctx, async function() {
        await ctx.render(TEMPLATE_NAME);
        await ctx.render(TEMPLATE_NAME);
        done();
      });
    });

    it('should reject loading specified view on `stream` error', function(done) {
      renderer({
        paths: { views: TEMPLATE_DIRECTORY }
      })(ctx, async function() {
        await ctx.render('bad');
      }).should.be.rejected.notify(done);
    });

    it('should load specified layout if `options.paths.layouts` is defined', function(done) {
      renderer({
        paths: {
          views:   TEMPLATE_DIRECTORY,
          layouts: TEMPLATE_DIRECTORY
        },
        defaultLayout: 'testing'
      })(ctx, async function() {
        await ctx.render(TEMPLATE_NAME);
      }).should.be.fulfilled.notify(done);
    });

    it('should load partials if `options.paths.partials` is defined', function(done) {
      renderer({
        paths: {
          views:    TEMPLATE_DIRECTORY,
          partials: TEMPLATE_DIRECTORY
        }
      })(ctx, async function() {
        await ctx.render(TEMPLATE_NAME);
      }).should.be.fulfilled.notify(done);
    });

    it('should reject loading partials on `stream` error', function(done) {
      renderer({
        paths: {
          views:    TEMPLATE_DIRECTORY,
          partials: 'bad'
        }
      })(ctx, async function() {
        await ctx.render(TEMPLATE_NAME);
      }).should.be.rejected.notify(done);
    });

    it('should set ctx.type to `text/html; charset=utf-8`', function(done) {
      renderer({
        paths: { views: TEMPLATE_DIRECTORY }
      })(ctx, async function() {
        await ctx.render(TEMPLATE_NAME);
        ctx.type.should.equal('text/html; charset=utf-8');
      }).should.be.fulfilled.notify(done);
    });

    it('should set ctx.body to the rendered template', function(done) {
      renderer({
        paths: { views: TEMPLATE_DIRECTORY }
      })(ctx, async function() {
        await ctx.render(TEMPLATE_NAME, {
          name: 'test'
        });
        ctx.body.should.be.a('string');
        ctx.body.should.equal('Hello, test');
      }).should.be.fulfilled.notify(done);
    });
  });
});
