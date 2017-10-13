/**
 * @file
 */
'use strict';


const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const Handlebars     = require('handlebars');
const path           = require('path');
const should         = chai.should();
const sinon          = require('sinon');
const sinonChai      = require('sinon-chai');


chai.use(chaiAsPromised);
chai.use(sinonChai);


const renderer = require('../../lib/index.js');


describe('createRenderer', function() {
  let options;

  beforeEach(function() {
    options = {
      cacheExpires:  60,
      contentTag:    'content',
      defaultLayout: 'default',
      environment:   'development',
      extension:     '.hbs',
      hbs:           Handlebars.create(),
      helperNamespaces: false,
      paths: {
        views:    path.join(__dirname, '../files/views'),
        layouts:  path.join(__dirname, '../files/layouts'),
        partials: path.join(__dirname, '../files/partials')
      }
    };
  });

  it('should be a function', function() {
    renderer.should.be.a('function');
  });

  it('should throw ReferenceError if options.paths is not defined', function() {
    (function() {
      renderer({});
    }).should.throw(ReferenceError);
  });

  it('should throw ReferenceError if options.paths.views is not defined', function() {
    (function() {
      renderer({
        paths: {}
      });
    }).should.throw(ReferenceError);
  });

  it('should register helpers if options.paths.helpers is defined', function() {
    sinon.stub(options.hbs, 'registerHelper');
    options.paths.helpers = path.join(__dirname, '../files/helpers');
    renderer(options);
    options.hbs.registerHelper.should.have.been.calledThrice;
  });

  it('should return an AsyncFunction', function() {
    let r = renderer(options);

    r.should.be.a('function');
    r.constructor.name.should.equal('AsyncFunction');
  });

  describe('rendererMiddleware', function() {
    let fn, next;

    beforeEach(function() {
      fn = renderer(options);
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

    it('should render the specified view', function(done) {
      delete options.paths.layouts;
      delete options.paths.partials;

      renderer(options)(ctx, async function() {
        await ctx.render('template', {
          adjective: 'useful'
        });

        ctx.body.should.equal('<p>This is a template. Isn\'t that useful?</p>');
      }).should.be.fulfilled.notify(done);
    });

    it('should render the default layout if available', function(done) {
      delete options.paths.partials;

      renderer(options)(ctx, async function() {
        await ctx.render('template', {
          adjective: 'useful'
        });

        ctx.body.should.equal('DEFAULT: <p>This is a template. Isn\'t that useful?</p>');
      }).should.be.fulfilled.notify(done);
    });

    it('should render the specified layout if provided', function(done) {
      delete options.paths.partials;

      renderer(options)(ctx, async function() {
        await ctx.render('template', {
          adjective: 'useful',
          layout: 'alternate'
        });

        ctx.body.should.equal('LAYOUT: <p>This is a template. Isn\'t that useful?</p>');
      }).should.be.fulfilled.notify(done);
    });

    it('should render any partials if available', function(done) {
      renderer(options)(ctx, async function() {
        await ctx.render('partial');

        ctx.body.should.equal('DEFAULT: <p>This is a template. Isn\'t that partial?</p>');
      }).should.be.fulfilled.notify(done);
    });


    it('should render partials in the specified layout', function(done) {
      renderer(options)(ctx, async function() {
        await ctx.render('template', {
          adjective: 'useful',
          layout: 'partial'
        });

        ctx.body.should.equal('PARTIAL: <p>This is a template. Isn\'t that useful?</p> partial');
      }).should.be.fulfilled.notify(done);
    });
  });
});
