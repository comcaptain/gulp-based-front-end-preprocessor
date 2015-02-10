# gulp-based-front-end-preprocessor #

## Install
`npm install gulp-based-front-end-preprocessor`

## This preprocessor does the following work: ##

1. concat files according to packages config
2. minify js and css files
3. add hash postfix to js/css file names
4. update references in corresponding html-like files(developed for html and jsp, but should be OK on other html-like files)
5. copy all but jsp/html files from source_dir to output_dir

## API ##
**NOTICE:** All file paths mentioned below are paths relative to source_dir
#### source_dir(required) ####
The directory of source files
#### output_dir(required) ####
The output directory
#### packages(optional) ####
default is `{}`, this object is organized as below:
- first level is html-like file path
- second level is concated js/css file path
- third level is js/css files to be concated

Example
```
{
	"test/jsp/test.jsp": {
		"test/js/test-all.js": [
			"test/js/test.js",
			"test/js/test01.js",
			"test/js/test02.js",
			"test/js/test03.js",
			"test/js/test04.js",
			"test/js/test05.js"
		],
		"test/js/test-lib.js": [
			"common/js/jquery-ui.min.js",
			"common/js/comboboxWidget.js"
		]
	},
	"order/jsp/order.jsp": {
		"order/js/order-all.css": [
			"order/js/order.css",
			"order/js/order01.css",
			"order/js/order02.css",
			"order/js/order03.css",
			"order/js/order04.css",
			"order/js/order05.css"
		],
		"order/js/order-lib.css": [
			"common/js/jquery-ui.min.css",
			"common/js/comboboxWidget.css"
		]
	}
}
```
#### requireTypeAttributeInJsTag(optional) ####
Default is false. If set to true, only script tags with `type="text/javascript"` attribute will be considered as legal, tags like`<script src="path/to/js/file"></script>` will be be ignored

#### css_js_files(optional) ####
Glob strings of to be processed js/css files. Default is `["**/*.js", "**/*.css"]`. About Glob string, you can reference [vinyl-fs](https://github.com/wearefractal/vinyl-fs) for detail.

#### html_like_files(optional) ####
Glob strings of to be processed html-like files. Default is `["**/*.jsp", "**/*.html"]`. About Glob string, you can reference [vinyl-fs](https://github.com/wearefractal/vinyl-fs) for detail.

#### convertRelativePathToReferenceUrl(optional) ####
Default is `function(str) {return str;}`. If path of js/css file is "test/js/test.js" while the reference url in html-like file is `<script type="text/javascript" src="./test/js/test.js"></script>`, then you can set convertRelativePathToReferenceUrl to:
`function(relativePath) { return "./" + relativePath;}`.

**NOTICE:** convertRelativePathToReferenceUrl and convertReferenceUrlToRelativePath should appear in pairs

#### convertReferenceUrlToRelativePath(optional) ####
Default is `function(str) {return str;}`. 

If path of js/css file is "test/js/test.js" while the reference url in html-like file is `<script type="text/javascript" src="./test/js/test.js"></script>`, then you can set convertRelativePathToReferenceUrl to:
`function(referenceUrl) {return referenceUrl.replace(/^(\.\/)?(.*)$/, "$2");}`

**NOTICE:** convertRelativePathToReferenceUrl and convertReferenceUrlToRelativePath should appear in pairs

## Simple Example ##
```
var processor = require("gulp-based-front-end-preprocessor");
var config = {
	source_dir: "source_dir",
	output_dir: "test"
}
processor.execute(config);
```
The code above will do the following work:
1. minify js and css files
2. add hash postfix to js/css file names
3. update references in corresponding jsp/html files
4. copy all but jsp/html files from source_dir to output_dir

## Full Featured Example ##
```
var processor = require("gulp-based-front-end-preprocessor");
var config = {
	packages: {
		"test/jsp/test.jsp": {
			"test/js/test-all.js": [
				"test/js/test.js",
				"test/js/test01.js",
				"test/js/test02.js",
				"test/js/test03.js",
				"test/js/test04.js",
				"test/js/test05.js"
			],
			"test/js/test-lib.js": [
				"common/js/jquery-ui.min.js",
				"common/js/comboboxWidget.js"
			]
		},
		"order/jsp/order.jsp": {
			"order/js/order-all.css": [
				"order/js/order.css",
				"order/js/order01.css",
				"order/js/order02.css",
				"order/js/order03.css",
				"order/js/order04.css",
				"order/js/order05.css"
			],
			"order/js/order-lib.css": [
				"common/js/jquery-ui.min.css",
				"common/js/comboboxWidget.css"
			]
		}
	},
	source_dir: "source_dir",
	output_dir: "test",
	requireTypeAttributeInJsTag: true,
	css_js_files: ["**/*.js", "**/*.css"],
	html_like_files: "**/*.html",
	//The following convertRelativePathToReferenceUrl and convertReferenceUrlToRelativePath works in this case:
	//if the reference in html-like files looks like: "./test/js/test.js",
	//while the real webRoot-relative path looks like "test/js/test.js"
	convertRelativePathToReferenceUrl: function(relativePath) {
		return "./" + relativePath;
	},
	convertReferenceUrlToRelativePath: function(referenceUrl) {
		return referenceUrl.replace(/^(\.\/)?(.*)$/, "$2");
	}
}
processor.execute(config);
```
