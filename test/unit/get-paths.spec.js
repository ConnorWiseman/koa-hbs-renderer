/**
 * @file Unit tests for lib/get-paths.js.
 */


const bluebird       = require('bluebird');
const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const path           = require('path');
chai.should();
chai.use(chaiAsPromised);


const getPaths = require('../../lib/get-paths.js');


const helpers = path.join(__dirname, '../files/helpers');


const options = {
  Promise: Promise
};


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
      paths.length.should.equal(1);
      paths[0].should.equal(path.join(helpers, 'double.js'));
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
      paths.length.should.equal(1);
      paths[0].should.equal(path.join(helpers, 'double.js'));
    }).should.be.fulfilled.notify(done);
  });
});
