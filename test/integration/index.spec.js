/**
 * @file
 */
'use strict';


const chai           = require('chai');
const chaiAsPromised = require('chai-as-promised');
const Koa            = require('koa');
const path           = require('path');
const supertest      = require('supertest');
const should         = chai.should();
const sinon          = require('sinon');
const sinonChai      = require('sinon-chai');


chai.use(chaiAsPromised);
chai.use(sinonChai);


const TEMPLATE_STRING = `DEFAULT: <p>This is a template. Isn't that useful?</p>`;


const renderer = require('../../lib/index.js');


describe('Renderer', function() {
  var app, request;

  before(function(done) {
    app = new Koa();

    app.use(renderer({
      paths: {
        views:    path.join(__dirname, '../files/views'),
        partials: path.join(__dirname, '../files/partials'),
        layouts:  path.join(__dirname, '../files/layouts'),
        helpers:  path.join(__dirname, '../files/helpers')
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
    request.get('/').expect(200).then(function() {
      return request.get('/').expect(200);
    }).then(function(result) {
      result.text.should.equal(TEMPLATE_STRING);
    }).should.be.fulfilled.notify(done);
  });
});
