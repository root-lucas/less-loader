/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var less = require("less");
var path = require("path");
var fs = require("fs");
function formatLessError(e, filename) {
	return new Error(e.message + "\n @ " + filename +
		" (line " + e.line + ", column " + e.column + ")");
}
module.exports = function(input) {
	this.cacheable && this.cacheable();
	var options = this;
	var cb = this.async();
	var resolve = cb ? options.resolve : options.resolve.sync;
	less.Parser.importer = function (file, paths, callback, env) {
		var context = path.dirname(env._parentFilename || env.filename);
		var moduleName = urlToRequire(file)
		if(cb) {
			options.resolve(context, moduleName, function(err, filename) {
				if(err) {
					options.callback(err);
					return;
				}
				options.dependency && options.dependency(filename);
				// The default (asynchron)
				fs.readFile(filename, 'utf-8', function(e, data) {
					if (e) return callback(e);

					try {
						new(less.Parser)({
							_parentFilename: filename,
							paths: [],
							compress: env.compress
						}).parse(data, function (e, root) {
							callback(e, root, data);
						});
					} catch(e) {
						try {
							callback(e);
						} catch(e) {
							options.callback(formatLessError(e, filename));
						}
					}
				});
			});
		} else {
			var filename = options.resolve.sync(context, moduleName);
			// Make it synchron
			try {
				var data = fs.readFileSync(filename, 'utf-8');
				new(less.Parser)({
					_parentFilename: filename,
					paths: [],
					compress: env.compress
				}).parse(data, function (e, root) {
					callback(e, root, data);
				});
			} catch(e) {
				try {
					callback(e);
				} catch(e) {
					options.callback(formatLessError(e, filename));
				}
			}
		}
	}
	var resultcb = cb || this.callback;

	less.render(input, {
		filename: this.filenames[0],
		paths: [],
		compress: !!this.minimize
	}, function(e, result) {
		resultcb(e, e ? null : "module.exports =\n\t" + JSON.stringify(result) + ";");
	});
}
function urlToRequire(url) {
	if(/^~/.test(url))
		return url.substring(1);
	else
		return "./"+url;
}
module.exports.seperableIfResolve = true;