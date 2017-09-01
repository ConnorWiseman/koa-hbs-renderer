/**
 * @file Unit tests for lib/template-manager.js.
 */


const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const Handlebars     = require('handlebars');
const path           = require('path');
chai.should();
chai.use(chaiAsPromised);


const templateManager = require('../../lib/template-manager.js');


const views    = path.join(__dirname, '../files/views');
const partials = path.join(__dirname, '../files/partials');
const view     = path.join(views, 'template.hbs');


describe('templateManager', function() {
  let options;

  beforeEach(function() {
    options = {
      environment:  'development',
      cacheExpires: 60,
      extension:    '.hbs',
      hbs:          Handlebars.create()
    };
  });

  it('should be a function', function() {
    templateManager.should.be.a('function');
  });

  it('should return an Object', function() {
    templateManager(options).should.be.an('Object');
  });

  it('should have `cache`, `compileTemplate`, and `compileTemplates` properties', function() {
    templateManager(options).should.have.all.keys([
      'cache', 'compileTemplate', 'compileTemplates'
    ]);
  });

  describe('.cache', function() {
    let manager;

    beforeEach(function() {
      manager = templateManager(options);
    });

    it('should be an Object', function() {
      manager.cache.should.be.an('Object');
    });

    it('should have `layout`, `partial`, and `view` properties', function() {
      manager.cache.should.have.all.keys([
        'layout', 'partial', 'view'
      ]);
    });
  });

  describe('#compileTemplate', function() {
    let manager;

    beforeEach(function() {
      manager = templateManager(options);
    });

    it('should be a function', function() {
      manager.compileTemplate.should.be.a('function');
    });

    it('should return a Promise', function() {
      manager.compileTemplate(view, 'view').should.be.a('Promise');
    });

    it('should reject if template is inaccessible', function(done) {
      manager.compileTemplate('bad template', 'view').should.be.rejected.notify(done);
    });

    it('should resolve to a compiled Handlebars template function', function(done) {
      manager.compileTemplate(view, 'view').then(function(fn) {
        fn.should.be.a('function');
        fn.name.should.equal('ret');
        fn.should.have.any.keys([ '_setup', '_child' ]);
      }).should.be.fulfilled.notify(done);
    });

    it('resolved function should have `_name` and `_cached` properties', function(done) {
      manager.compileTemplate(view, 'view').then(function(fn) {
        fn.should.have.any.keys([ '_name', '_cached' ]);
      }).should.be.fulfilled.notify(done);
    });

    it('should return from the cache', function(done) {
      manager.compileTemplate(view, 'view').then(function() {
        return manager.compileTemplate(view, 'view');
      }).should.be.fulfilled.notify(done);
    });
  });

  describe('#compileTemplates', function() {
    let manager;

    beforeEach(function() {
      manager = templateManager(options);
    });

    it('should be a function', function() {
      manager.compileTemplates.should.be.a('function');
    });

    it('should return a Promise', function() {
      manager.compileTemplates(views, 'view').should.be.a('Promise');
    });

    it('should resolve to an object map of compiled Handlebars template functions', function(done) {
      manager.compileTemplates(partials, 'partial').then(function(obj) {
        obj.should.be.an('object');
        obj.should.have.keys([ 'partial' ]);
      }).should.be.fulfilled.notify(done);
    });
  });
});
