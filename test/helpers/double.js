/**
 * @file
 */
'use strict';


/**
 * A sample Handlebars helper function that returns twice the value of a
 * specified Number.
 * @param  {Number} n
 * @return {Number}
 */
module.exports = function double(n) {
  return Number(n) * 2;
};
