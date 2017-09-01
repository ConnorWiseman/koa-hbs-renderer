/**
 * @file Unit tests for lib/get-paths.js.
 */


const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const path           = require('path');
chai.should();
chai.use(chaiAsPromised);


const getPaths = require('../../lib/get-paths.js');


const helpers = path.join(__dirname, '../files/helpers');


describe('getPaths', function() {
  it('should be a function', function() {
    getPaths.should.be.a('function');
  });

  it('should return a Promise', function() {
    getPaths(helpers, '.js').should.be.a('Promise');
  });

  it('should reject if directory is inaccessible', function(done) {
    getPaths('bad directory', '.js').should.be.rejected.notify(done);
  });

  it('should resolve to an array', function(done) {
    getPaths(helpers, '.js').then(function(paths) {
      paths.should.be.an('Array');
    }).should.be.fulfilled.notify(done);
  });

  it('should resolve to an array of correct file paths', function(done) {
    getPaths(helpers, '.js').then(function(paths) {
      paths.length.should.equal(1);
      paths[0].should.equal(path.join(helpers, 'double.js'));
    }).should.be.fulfilled.notify(done);
  });
});
