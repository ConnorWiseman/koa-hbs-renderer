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
 * Traverses the target directory, recursively asynchronously retrieving all
 * file paths in the directory as an array of file paths.
 * @param  {String}   dir
 * @param  {Function} cb
 * @return {FilePathArray}
 */
function traverseDirectory(dir,cb) {
  let results = [];

  fs.readdir(dir, (error, filePaths) => {
    if (error) {
      return cb(error, null);
    }

    let numFilePaths = filePaths.length;

    if (!numFilePaths) {
      return cb(null, results);
    }

    filePaths.forEach((filePath) => {
      const fullFilePath = path.resolve(dir, filePath);

      fs.stat(fullFilePath, (error, stat) => {
        if (error) {
          return cb(error, null);
        }

        if (stat.isDirectory()) {
          traverseDirectory(fullFilePath, (error, result) => {
            if (error) {
              return cb(error, null);
            }

            results = results.concat(result);

            if (!--numFilePaths) {
              return cb(null, results);
            }
          });
        } else {
          results.push(path.join(dir, filePath));

          if (!--numFilePaths) {
            return cb(null, results);
          }
        }
      });
    });
  });
};


/**
 * Returns an array of file paths mapped from a directory of files.
 * @param  {String} dir       The directory to search in
 * @param  {String} ext       The file extension to filter
 * @param  {Object} [options]
 * @return {Promise.<FilePathArray>}
 * @private
 */
module.exports = function getPaths(dir, ext, options) {
  return new options.Promise((resolve, reject) => {
    traverseDirectory(dir, (error, results) => {
      if (error) {
        return reject(error);
      }

      resolve(results.filter((filePath) => {
        return path.extname(filePath) === ext;
      }).map(file => {
        return path.resolve(dir, file);
      }));
    });
  });
};
