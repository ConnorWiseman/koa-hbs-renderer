/**
 * @file Unit tests for lib/get-paths.js.
 */


const bluebird       = require('bluebird');
const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const fs             = require('fs');
const path           = require('path');
const proxyquire     = require('proxyquire').noPreserveCache();
const should         = chai.should();
const sinon          = require('sinon');
const sinonChai      = require('sinon-chai');


chai.use(chaiAsPromised);
chai.use(sinonChai);


const getPaths = proxyquire('../../lib/get-paths.js', { fs });


const helpers = path.join(__dirname, '../files/helpers');


const options = {
  Promise: Promise
};


describe('traverseDirectory', function() {
  it('should execute the callback immediately if there are no files in the target directory', function(done) {
    sinon.stub(fs, 'readdir').callsArgWith(1, null, []);
    getPaths(helpers, '.js', options).then(function(paths) {
      paths.length.should.equal(0);
      fs.readdir.restore();
    }).should.be.fulfilled.notify(done);
  });

  it('should return errors in `fs.readdir`', function(done) {
    sinon.stub(fs, 'readdir').onCall(0).callsArgWith(1, true, null);
    getPaths(helpers, '.js', options).should.be.rejected.notify(function() {
      fs.readdir.restore();
      done();
    });
  });

  it('should return errors in `fs.stat`', function(done) {
    sinon.stub(fs, 'stat').callsArgWith(1, true, null);
    getPaths(helpers, '.js', options).should.be.rejected.notify(function() {
      fs.stat.restore();
      done();
    });
  });

  it('should return errors in recursive `fs.readdir`', function(done) {
    sinon.stub(fs, 'readdir').onCall(0).callsArgWith(1, null, [ 'test' ])
                             .onCall(1).callsArgWith(1, true, null);
    sinon.stub(fs, 'stat').callsArgWith(1, null, {
      isDirectory: () => true
    });
    getPaths(helpers, '.js', options).should.be.rejected.notify(function() {
      fs.stat.restore();
      fs.readdir.restore();
      done();
    });
  });
});


describe('getPaths', function() {
  it('should be a function', function() {
    getPaths.should.be.a('function');
  });

  it('should return a Promise', function() {
    getPaths(helpers, '.js', options).should.be.a('Promise');
  });

  it('should use Promise object specified in options', function(done) {
    options.Promise = bluebird;
    let p = getPaths(helpers, '.js', options);
    p.constructor.name.should.equal('Promise');
    p.then(function(paths) {
      paths.length.should.equal(3);
      paths.should.include(path.join(helpers, 'double.js'));
      paths.should.include(path.join(helpers, 'subdirectory', 'double.js'));
      paths.should.include(path.join(helpers, 'ns.js'));
    }).should.be.fulfilled.notify(done);
  });

  it('should reject if directory is inaccessible', function(done) {
    getPaths('bad directory', '.js', options).should.be.rejected.notify(done);
  });

  it('should resolve to an array', function(done) {
    getPaths(helpers, '.js', options).then(function(paths) {
      paths.should.be.an('Array');
    }).should.be.fulfilled.notify(done);
  });

  it('should resolve to an array of correct file paths', function(done) {
    getPaths(helpers, '.js', options).then(function(paths) {
      paths.length.should.equal(3);
      paths.should.include(path.join(helpers, 'double.js'));
      paths.should.include(path.join(helpers, 'subdirectory', 'double.js'));
      paths.should.include(path.join(helpers, 'ns.js'));
    }).should.be.fulfilled.notify(done);
  });
});
