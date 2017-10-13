/**
 * @file
 */
'use strict';


const double = require('./double.js');


/**
 * A sample Handlebars helper function that returns thrice the value of a
 * specified Number.
 * @param  {Number} n
 * @return {Number}
 */
function triple(n) {
  return Number(n) * 3;
};


module.exports = { double, triple };
