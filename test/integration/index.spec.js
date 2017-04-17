/**
 * @file
 */
'use strict';

// Require Node modules and perform setup.
const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const Koa            = require('koa');
const path           = require('path');
const supertest      = require('supertest');
const sinon          = require('sinon');
const sinonChai      = require('sinon-chai');
chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);

// Define local constants.
const eol = (process.platform === 'win32' ? '\r\n' : '\n');
const TEMPLATE_STRING = `<!DOCTYPE html>${eol}\
<html lang="en-US">${eol}\
    <head>${eol}\
        <title>Title!</title>${eol}\
        <meta charset="utf-8" />${eol}\
    </head>${eol}\
${eol}\
    <body>${eol}\
        <p>This is a template. Isn't that useful?</p>\n\n<p>This is a partial!</p>${eol}\
${eol}\
    </body>${eol}\
</html>${eol}`;

// Require module to test.
const renderer = require('../../index.js');

// Describe tests.
describe('Renderer', function() {
  let app, request;

  before(function(done) {
    app = new Koa;

    app.use(renderer({
      paths: {
        views: path.join(__dirname, 'views'),
        partials: path.join(__dirname, 'views/partials'),
        layouts: path.join(__dirname, 'views/layouts')
      }
    }));

    app.use(async (ctx, next) => {
      ctx.state.title = 'Title!';

      await ctx.render('template', {
        adjective: 'useful'
      });
    });

    app.listen(3000, function() {
      request = supertest('http://localhost:3000');
      done();
    });
  });

  it('should render the specified template', function(done) {
    request.get('/').expect(200).then(function(result) {
      result.text.should.equal(TEMPLATE_STRING);
    }).should.be.fulfilled.notify(done);
  });

  it('should render the specified template from the cache', function(done) {
    request.get('/').expect(200).then(function(result) {
      return request.get('/').expect(200);
    }).then(function(result) {
      result.text.should.equal(TEMPLATE_STRING);
    }).should.be.fulfilled.notify(done);
  });
});
