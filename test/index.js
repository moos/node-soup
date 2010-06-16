// node-soup test module
// signature: function (exports, require, module, __filename, __dirname)


var
	simple = {
		path  : '../deps/node/test/simple/',
		tests : _getFileContent('test-node-simple.txt').split('\n')
	},
	fixtures = {
		path  : '../deps/node/test/fixtures/',
		tests : 'a echo exit'.split(' ')
	};


// filter hook into module
var Module = module.constructor;
Module.prototype._compile_orig = Module.prototype._compile;
Module.prototype._compile = function (content, filename) {
	if (filename in filters) {
		content = filters[filename](content);
	}
	return this._compile_orig(content, filename); 
}

var filters = {};
function filter_silent(content){
	return (  "// test unit mods!\n"
			+ "require.main.unitTest.enter('silence');\n"
			+ content 
			+  "\n\n;// test unit unmods!\n"
			+ "require.main.unitTest.leave('silence');\n"
			);
}

// load assert here so we can wrap its methods for verbose mode
var assert = require('assert');
(function(){
	
	wrapMethods(assert);

	function wrapMethods(exports) {
		// wrap all methods
		for (var k in exports){
			var f = exports[k];
			if (typeof f != 'function') continue;
	
			// wrap everything but AssertionError
			if (f.name && f.name == 'AssertionError' ) continue;
			
			exports[k] = (function(f,k){	// closure for f,k
				return makeWrapper(f,k); 
			})(f,k);
		}
	}
	function makeWrapper(f,k){
		return function(){
			if (require.main.unitTest.isVerbose() ) { 
				QUnit.ok(true, k + '...' + QUnit.jsDump.parse(arguments) );
				//console.log('wrapper::', f, arguments, module.id);
			} else
				++ require.main.unitTest.counter;
			
			f.apply(f,arguments);
		}
	}
})();

require.main.unitTest = {};
require.main.unitTest.verbose = [];
require.main.unitTest.counters = [];
require.main.unitTest.counter = 0;
require.main.unitTest.isVerbose = function(){
	return this.verbose.length ? this.verbose[this.verbose.length-1] : true;
}
require.main.unitTest.enter = function(mode){
	if (mode == 'silence') {
		this.silencePrint(true);
		this.verbose.push(false);
		this.counter = 0;
	} 
}	
require.main.unitTest.leave = function(mode){
	if (mode == 'silence') {
		this.verbose.pop(); 
		this.silencePrint(false);			
		this.counters.push(this.counter);
	}
}

// 'print' silencer.  print is a local variable of calling scope (actully in ../common.js)
require.main.unitTest.silencePrint = function(silent){
	if (silent) {
		if (!this._print) this._print = print;
		print = function(){}	// empty
	} else {
		print = this._print;
	}
}

function runTests(which){
	var hide = false;
	which.tests.some(function(name,index){
		if (name.indexOf('#.show') == 0) {hide = false; return} 
		if (name.indexOf('#.exit') == 0) {return true} 	// skip the rest
		if (name.indexOf('#.hide') == 0) {hide = true}
		if (hide) return;
		
		if (/^#?\s+|^\s*$/.test(name)) return; 			// skip blank lines and # comments
		if (name[0] == '#') {							// skip #test 
			QUnit.test(name + ' -- SKIPPED', function(){});
			return;
		}
		var file = which.path + name.replace(/.js$/i, ''); // discard .js ext for require()
		
		QUnit.asyncTest(name, function(){
			try {
				var tmp = require(file);
				var c = require.main.unitTest.counters.pop();
				if (c) ok(true, 'success '+ name + ' ('+ c + ' assertions)' );
			} 
			catch(e) {
				ok(false, e);
			}
			setTimeout(start, 500);
			delete tmp;
		})
	});
}

filters[simple.path + 'test-buffer.js'] = filter_silent;
	

//run tests

QUnit.module("simple");
runTests(simple);


