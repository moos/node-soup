// node-soup test module
// signature: function (exports, require, module, __filename, __dirname)

//console.log('testrunner begin', [exports, typeof require,  typeof module, __filename, __dirname]  );

importScripts('qunit/qunit/qunit.js');

// override object parser to prevent 'too much recursion'
QUnit.jsDump.parsers._object = QUnit.jsDump.parsers.object;	// save original
QUnit.jsDump.setParser('object',function(obj){
	if (obj.constructor && obj.constructor.name) return obj.constructor.name;
	if (this._depth_ > 2) return '"[Object]" MAX DEPTH'; 
	return this.parsers._object.call( this, obj );
});

// hook into module to apply filters

var Module = module.constructor;

Module.prototype._compile_orig = Module.prototype._compile;
Module.prototype._compile = function (content, filename) {
	
	if (filename in filters) {
		filters[filename].forEach(function(f){ content = f(content) }) ;
	}
	// global filter - make global available to modules
	//	content = "with (global) {\n" + content + "\n}\n";

	return this._compile_orig(content, filename); 
}

// define filters

var filters = {};

function filter_silent(content){
	content = (  "require.main.unitTest.enter('silence');\n"
			+ content 
			+ "\n;require.main.unitTest.leave('silence');\n"
			);
	return content;
}

// load assert here so we can wrap its methods for verbose mode

assert = require('assert');
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
				
				var msg = QUnit.jsDump.parse(arguments);
				postMessage({type:'data' , msg: k+'...'+ truncate(msg) + ' ?'});
			} else {
				++ require.main.unitTest.counter;
			}
			f.apply(f,arguments);
		}
	}
	function truncate(str, len) {
		len = len || 768;
		if (str.length > len)
			str = str.substring(0,len) + '... [+ ' + (str.length - len) + ' more]';
		return str;
	}
})();

// extend require.main (accessed from within individual test files)

require.main.unitTest = {
	verbose   : [],
	counters  : [],
	counter   : 0,
	isVerbose : function(){
		return this.verbose.length ? this.verbose[this.verbose.length-1] : true;
	},
	enter : function(mode){
		if (mode == 'silence') {
			this.silencePrint(true);
			this.verbose.push(false);
			this.counter = 0;
		} 
	},	
	leave : function(mode){
		if (mode == 'silence') {
			this.verbose.pop(); 
			this.silencePrint(false);			
			this.counters.push(this.counter);
		}
	},
	// 'print' silencer. 
	silencePrint : function(silent){
		var sys = require('sys');
		if (silent) {
			if (!this._print) this._print = sys.print;
			sys.print = function(){}	// empty
		} else {
			sys.print = this._print;
		}
	}
};


// note: this must be defined as a function expression to be recognized across worker scripts
// self is Worker object
var timer = null;
self.TIMEOUT = 6000;	// msec
self.runTest = function (file) {

	console.log('runTest ', file);
	
	if (/test-buffer/.test(file)) {
		filters [file+'.js'] = [ filter_silent ];
	}

	// async testing requires an end marker.  this is usually done with some 'finish' or 'done' callback
	// from the test suite.  since we don't have access to the actual test suite, we'll set some artificially
	// sufficient timeout
	timer = setTimeout(workerDone, TIMEOUT, true);	// longer tests may need more time!!!!!!!!!! <<<<<<<	

	try{
		
		// add listener for end of test -- may or may not fire!
		process.addListener('exit',function(){
			console.log('///////////', this, arguments);
			workerDone();
		})
		
		// actual test file
		require(file);

	} catch(e){
		// this catches sync (non-callback) exceptions. 
		// async exceptions are caught by worker's onerror handler
		postMessage({type:'error' , msg : new Error(e) });
		workerDone();
	}
}


function workerDone( timedout ){
	clearTimeout(timer);
	
	if ( timedout ){
		postMessage({type:'error', msg: new Error('test timedout after '+self.TIMEOUT+' (see  self.TIMEOUT in '+__filename+')' ) });
	}
	
	postMessage({type:'done', count: require.main.unitTest.counters.pop() || null });
	// close the worker
	close();
}

