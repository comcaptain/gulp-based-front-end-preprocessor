//option: url full match or postfix match
var fs = require('fs');
var gulp = require("gulp");
var es = require("event-stream");
var path = require("path");
var hash = require("gulp-hash");
var uglify = require('gulp-uglify');
var extend = require("extend");
var gutil = require('gulp-util');
var minifyCss = require('gulp-minify-css');
function getRelativePath(file) {
	var basePath = path.resolve(file.cwd);
	return file.path.substring(basePath.length + 1).replace(/\\/g, "/");
}
function getRelativeFolder(file) {
	var basePath = path.resolve(file.cwd);
	return path.dirname(file.path.substring(basePath.length + 1).replace(/\\/g, "/"));
}
// [["path/to/js/file", startIndex, endIndex, "spaces"], ...]
function getScriptTags(html) {
	var tags = [];
	if (!html || html.length == 0) return tags;
	var regex = /\n?(\s*)<script\s[^>]*src=["']?([^"'>]*)["']?[^>]*>[\s\n]*<\/script\s*>/g;
	var match = undefined;
	while (match = regex.exec(html)) {
		var scriptTagString = match[0].replace(/[\s\n\r]+/g, " ");
		if (config.requireTypeAttributeInJsTag 
			&& !scriptTagString.match(/type=("text\/javascript"|'text\/javascript'|text\/javascript)/)) continue;
		tags.push([match[2], match.index, regex.lastIndex, match[1]]);
	}
	return tags;
}
// [["path/to/css/file", startIndex, endIndex, "spaces"], ...]
function getCssLinkTags(html) {
	var tags = [];
	if (!html || html.length == 0) return tags;
	var regex = /\n?(\s*)<link\s[^>]*href=["']?([^"'>]*)["']?[^>]*\/>/g;
	var match = undefined;
	while (match = regex.exec(html)) {
		var linkTagString = match[0].replace(/[\s\n\r]+/g, " ");
		if (!linkTagString.match(/type=("text\/css"|'text\/css'|text\/css)/)) continue;
		if (!linkTagString.match(/rel=("stylesheet"|'stylesheet'|stylesheet)/)) continue;
		tags.push([match[2], match.index, regex.lastIndex, match[1]]);
	}
	return tags;
}
function packageFiles(packageConfig) {
	// {
	// 	"packageFile1": {
	// 		partPaths: ["path/to/part1", "path/to/part2", "path/to/part3", "path/to/part4"],
	// 		partContents: [part5File, part6File...],
	//		remained: 4,
	//		htmlLikeFilePath: "/path/to/jsp"
	// 	} 
	// 	"packageFile2": {
	// 		partPaths: ["path/to/part1", "path/to/part2", "path/to/part3", "path/to/part4"],
	// 		partContents: [part5File, part6File...],
	//		remained: 4,
	//		htmlLikeFilePath: "/path/to/jsp"
	// 	}...
	// }
	var map = {};
	// {
	// 	"path/to/part1": [
	// 		["packageFile1", indexInPackageFile1],
	// 		["packageFile2", indexInPackageFile2],
	// 	]
	// 	...
	// }
	var reverseMap = {};
	for (var htmlName in packageConfig) {
		for (var packFile in packageConfig[htmlName]) {
			map[packFile] = {
				partPaths: [],
				partContents: [],
				remained: 0,
				htmlLikeFilePath: htmlName
			};
			for (var i = 0; i < packageConfig[htmlName][packFile].length; i++) {
				var file = packageConfig[htmlName][packFile][i];
				if (reverseMap[file] == undefined) {
					reverseMap[file] = [];
				}
				reverseMap[file].push([packFile, i]);
				map[packFile]["partPaths"].push(file);
				map[packFile]["remained"]++;
			}
		}	
	}
	var stream = es.through(function(file) {
		var partPath = getRelativePath(file);
		var packageFiles = reverseMap[partPath];
		// console.log(reverseMap);
		if (packageFiles) {
			for (var i = 0; i < packageFiles.length; i++) {
				var packageFilePath = packageFiles[i][0];
				var index = packageFiles[i][1];
				map[packageFilePath]["partContents"][index] = file.contents.toString();
				map[packageFilePath].remained--;
				if (map[packageFilePath].remained == 0) {
					var newPackageFile = new gutil.File({ 
						cwd: file.cwd, 
						base: file.base, 
						path: file.base.replace(/\\/g, "/") + "/" + packageFilePath, 
						contents: new Buffer(map[packageFilePath]["partContents"].join("")) 
					})
					newPackageFile.htmlLikeFilePath = map[packageFilePath].htmlLikeFilePath;
					newPackageFile.parts = map[packageFilePath].partPaths;
					this.queue(newPackageFile);
				}
			}
		}
		this.queue(file);
	},
	function() {
		for (var packageFileName in map) {
			if (map[packageFileName].remained > 0) {
				console.error(packageFileName + " does not have all part files included");
			}
		}
		this.queue(null);
	});
	return stream;
}
function updateTags(html, mode, map, convertReferenceUrlToRelativePath, convertRelativePathToReferenceUrl) {
	var tags;
	var usedTargetFiles = {};
	if (mode == "js") {
		tags = getScriptTags(html);
	} 
	//css
	else {
		tags = getCssLinkTags(html);
	}
	var lastIndex = 0;
	var newHtml = "";
	for (var i = 0; i < tags.length; i++) {
		var startIndex = tags[i][1];
		var endIndex = tags[i][2];
		var originalUrl = convertReferenceUrlToRelativePath(tags[i][0]);
		var targetUrl = map[originalUrl];
		newHtml += html.substring(lastIndex, startIndex);
		if (usedTargetFiles[targetUrl] == undefined) {
			newHtml += tags[i][3];
			var newResourceUrl = convertRelativePathToReferenceUrl(targetUrl);
			if (newResourceUrl.match(/\.js$/)) {
				newHtml += '<script type="text/javascript" src="' + newResourceUrl + '"></script>';
			}
			else {
				newHtml += '<link type="text/css" rel="stylesheet" href="' + newResourceUrl + '" />';
			}
			usedTargetFiles[targetUrl] = 1;
		}
		lastIndex = endIndex;
	}
	newHtml += html.substring(lastIndex);
	return newHtml;
}
function updateReferences(targetFiles, options) {
	// {"path/to/original/file": "path/to/hash/file", ....}
	var hashMap = {};
	// {
	// 	"path/to/htmllike/file": {
	// 		"path/to/original/file": "path/to/packaged/hash/file",....
	// 	},...
	// }
	var packageMap = {};
	var stream = es.map(function(resourceFile, callback) {
		if (resourceFile.parts) {
			var reverseMap = {};
			for (var packageFile in resourceFile.parts) {
				reverseMap[resourceFile.parts[packageFile]] = getRelativePath(resourceFile);
			}
			packageMap[resourceFile.htmlLikeFilePath] = reverseMap;
		}
		else {
			var originalFilePath = getRelativeFolder(resourceFile) + "/" + resourceFile.origFilename;
			hashMap[originalFilePath] = getRelativePath(resourceFile);
		}
		callback(null, resourceFile);
	})
	.on("end", function() {
		targetFiles.pipe(es.map(function(htmlLikeFile, callback) {
			var htmlLikeFilePath = getRelativePath(htmlLikeFile);
			var map = hashMap;
			if (packageMap[htmlLikeFilePath]) {
				map = extend(true, {}, hashMap, packageMap[htmlLikeFilePath]);
			}
			var html = htmlLikeFile.contents.toString();
			var newHtml = updateTags(html, "css", map, 
					options.convertReferenceUrlToRelativePath, options.convertRelativePathToReferenceUrl);
			newHtml = updateTags(newHtml, "js", map, 
					options.convertReferenceUrlToRelativePath, options.convertRelativePathToReferenceUrl);
			htmlLikeFile.contents = new Buffer(newHtml);
			callback(null, htmlLikeFile);
		}))
		.pipe(gulp.dest(options.output_dir));
	});
	return stream;
}
function minify() {
	var stream = es.map(function(file, callback) {
		var minifyStream = es.through(function(f) {
			this.queue(f);
		});
		if (file.path.match(/\.js$/)) {
			minifyStream.pipe(uglify()).pipe(es.through(function(f) {
				callback(null, f);
			}));
		}
		else if (file.path.match(/\.css$/)) {
			minifyStream.pipe(minifyCss()).pipe(es.through(function(f) {
				callback(null, f);
			}));
		}
		minifyStream.end(file);
	});
	return stream;
}
function getOtherFiles(filePaths) {
	var otherFiles = ["**/*"];
	for (var i = 0; i < filePaths.length; i++) {
		var filePath = filePaths[i];
		if (filePath.match(/^!/)) {
			otherFiles.push(filePaths[i].substring(1));
		}
		else {
			otherFiles.push("!" + filePaths[i]);
		}
	}
	return otherFiles;
}
var defaultConfig = {
	css_js_files: ["**/*.js", "**/*.css"],
	html_like_files: ["**/*.jsp", "**/*.html"],
	convertRelativePathToReferenceUrl: function(absolutePath) {
		return absolutePath;
	},
	convertReferenceUrlToRelativePath: function(resourceUrl) {
		return resourceUrl;
	},
	requireTypeAttributeInJsTag: false
}
var config = {};
module.exports = {
	execute: function(inputConfig) {
		config = extend(true, defaultConfig, inputConfig);
		gulp.src(config.css_js_files, {cwd: config.source_dir})
			.pipe(packageFiles(config.packages))
			.pipe(minify())
			.pipe(hash())
			.pipe(updateReferences(gulp.src(config.html_like_files, {cwd: config.source_dir}), config))
			.pipe(gulp.dest(config.output_dir));
		gulp.src(getOtherFiles([].concat(config.html_like_files)), {cwd: config.source_dir})
			.pipe(gulp.dest(config.output_dir));
	},
	packageFiles: packageFiles,
	updateReferences: updateReferences
}