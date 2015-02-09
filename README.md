# gulp-based-front-end-preprocessor

## Install
`npm install gulp-based-front-end-preprocessor`

##This preprocessor does the following work:

1. concat files according to packages config
2. minify js and css files
3. add hash postfix to js/css file names
4. update references in corresponding html-like files(developed for html and jsp, but should be OK on other html-like files)

##Remarks
In config, the `css_js_files` and `html_like_files` are glob strings, you can reference [vinyl-fs](https://github.com/wearefractal/vinyl-fs) for detail.

##Example
```
var processor = require("gulp-based-front-end-preprocessor");
//all these configuration properties are required, no one can be ignored
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
			"order/js/order-all.js": [
				"order/js/order.js",
				"order/js/order01.js",
				"order/js/order02.js",
				"order/js/order03.js",
				"order/js/order04.js",
				"order/js/order05.js"
			],
			"order/js/order-lib.js": [
				"common/js/jquery-ui.min.js",
				"common/js/comboboxWidget.js"
			]
		}
	},
	source_dir: "source_dir",
	output_dir: "test",
	css_js_files: ["**/*.js", "**/*.css"],
	html_like_files: "**/*.jsp",
	//The following convertRelativePathToReferenceUrl and convertReferenceUrlToRelativePath works in this case:
	//if the reference in html-like files looks like: "./test/js/test.js",
	//while the real webRoot-relative path looks like "test/js/test.js"
	convertRelativePathToReferenceUrl: function(absolutePath) {
		return "./" + absolutePath;
	},
	convertReferenceUrlToRelativePath: function(resourceUrl) {
		return resourceUrl.replace(/^(\.\/)?(.*)$/, "$2");
	}
}
processor.execute(config);
```
**Version 1.0.2**
Now files not processed will also be copied to destination folder
