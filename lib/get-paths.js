/**
 * @file Exports a function used to acquire file names and paths that match a
 *       specified file extension from a specified directory.
 */


const fs   = require('fs');
const path = require('path');


/**
 * @typedef FilePathArray
 * An array of file paths.
 * @type {Array.<String>}
 */


/**
 * Returns an array of file paths mapped from a directory of files.
 * @param  {String}   dir The directory to search in
 * @param  {String}   ext The file extension to filter
 * @return {Promise.<FilePathArray>}
 * @private
 */
module.exports = function getPaths(dir, ext) {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (error, files) => {
      if (error) {
        return reject(error);
      }

      let results = files.filter(file => {
        return path.extname(file) === ext;
      }).reduce((files, file) => {
        files.push(path.resolve(dir, file));

        return files;
      }, []);

      return resolve(results);
    });
  });
};