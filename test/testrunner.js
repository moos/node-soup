/*
 * testrunner.js
 * 
 *   - is run within node.js
 *   - hooks into node module loader to apply filters
 *   - wraps node assertion methods to capture test meta
 * 
 * copyright (c) 2010 Moos
 * http://github.com/moos
 */
// signature: function (exports, require, module, __filename, __dirname)


// period after which test is assumed hung (increase if needed for longer tests)
var TIMEOUT = 10000;	// msec

// just need the parser here
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
		filters[filename].forEach(function(f){ content = apply_filter(f, content) }) ;
	}
	return this._compile_orig(content, filename); 
}

// define filters
var filters = {};
function apply_filter(filter, content){
	return 'require.main.unitTest.enter("'+filter+'");\n'
			+ content 
			+ '\n;require.main.unitTest.leave("'+filter+'");\n' 
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
				
				postMessage({type:'data' , message: k+'...'+ truncate(msg) + ' ?'});
				
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
var timer = null;
worker.listenerAdded = false;

worker.runTest = function (file) {

	console.log('runTest ', file);
	
	// have filters?
	if (/test-buffer/.test(file)) {
		filters [file+'.js'] = [ 'silence' ];
	}

	// async testing requires an end marker.  this is usually done with some 'finish' or 'done' callback
	// from the test suite.  since we don't have access to the actual test suite, we'll set some artificially
	// sufficient timeout
	timer = setTimeout(workerDone, TIMEOUT, true);	// longer tests may need more time!!!!!!!!!! <<<<<<<	

	try{		
		// actual test file
		require(file);

		// add listener for end of test -- may or may not fire!
		process.addListener('exit', worker.exitListener);
		worker.listenerAdded = true;
		
	} catch(e){
		// this catches sync (non-callback) exceptions. 
		// async exceptions are caught by worker's onerror handler

		console.log(111, typeof e, ''+e, e.message, e, Object.keys(e), e.constructor === assert.AssertionError);

		if (e.constructor === assert.AssertionError) {
			worker.handleAssertError(e);
		} else {
			worker.handleUncaughtException(e);
		}
	}
}

worker.exitListener = function(code) {
	console.log('///////////', this, arguments);
	if (code !== 0)
		postMessage({type:'error' , message: 'exit code: '+code});
	workerDone();
}

worker.workerDone = function ( timedout ){
	clearTimeout(timer);
	if ( timedout ){
		postMessage({type:'error', message: 'test timedout after '+TIMEOUT+' (may want to increase TIMEOUT in '+__filename+')'  });
		// force exit! (will emit 'exit')
		process.reallyExit(-1);
		return;
	}	
	postMessage({type:'done', count: require.main.unitTest.counters.pop() || null });
	// close the worker
	worker.close();
}

