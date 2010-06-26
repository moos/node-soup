/*
 * index.js
 * 
 * node-soup test module main js file
 * 
 * - uses QUnit test framework
 * - loads list of test files
 * - runs each test in a web worker
 * - when test is done, display result using QUnit
 * 
 * copyright (c) 2010 Moos
 * http://github.com/moos
 */

var
	simple = {
		path  : '../deps/node/test/simple/',
		tests : getFileContent('test-node-simple.txt').split(/\r?\n/)
	};



//require(simple.path + 'test-http-1.0'); return;


function runTests(which){
	var ignore = hide = false;
	
	which.tests.some(function(name,index){
		var b = parseFileList(name); 
		if (typeof b == 'boolean') return !ignore && b;
		var file = which.path + name.replace(/.js$/i, ''); // discard .js ext for require()

		// queue up async tests -- start() will run them sequentially
		QUnit.asyncTest(name, function(){

			// run test in worker
			initWorker(file);
		})
	});

	function parseFileList(name){
		if (name.indexOf('#.ignore') == 0) {ignore = true; return false} 
		if (name.indexOf('#.show') == 0) {hide = false; return false} 
		if (name.indexOf('#.exit') == 0) {return true} 	// skip the rest
		if (name.indexOf('#.hide') == 0) {hide = true}
		if (!ignore && hide) return false;
		if (/^#?\s+|^\s*$/.test(name)) return false;	// skip blank lines and # comments
		if (name[0] == '#') {							// skip #test 
			QUnit.test(name + ' -- SKIPPED', function(){});
			return false;
		}
		// return nothing continues
	}
}

// if no assersions in test, mark it fail!
QUnit.testDone = function (name, failures, total) {
	if (total <= 0) {
		document.querySelector('#qunit-tests > li:last-child').className = 'fail';
	}
}
	
var worker = null;
function initWorker(file) {
	
	worker = new Worker('worker.js');
	worker.onmessage = function(ev){
		// get 'Uncaught illegal access' doing JSON.parse(ev.data)
		var data = ev.data;
		switch(data.type){
		case 'done':	// worker is done - trigger asyn test
			if (data.count !== null)
				QUnit.ok(true, 'success ('+ data.count + ' assertions)');
			QUnit.start();
			return;
		case 'data':	// data is a test data point
			QUnit.ok(true, data.msg);
			return;
		case 'error':	// a test error occurred
			
			console.log(data.msg);
			
			QUnit.ok(false, data.msg.message);
			return;
		case 'fatal': 	// exception not handled by node
			QUnit.ok(false, 'fatal: ' + data.msg);
			QUnit.start();		// start if it wasn't started by worker
			worker.terminate();	// force terminate worker
			return;
		case 'log':
		default:
			console.log('worker says:', data.msg);
			return;
		}
	}
	worker.onerror = function(ev){
		// uncaught exception! includes any async exceptions & assertion fails
		console.error('worker onerror:', ev);

		// Clean up message.  chrome adds 'uncaught <classname>: ' to message
		// TODO Firefox sometimes returns blank, 
			// bug: https://bugzilla.mozilla.org/show_bug.cgi?id=512157
			// and: http://www.nczonline.net/blog/2009/08/25/web-workers-errors-and-debugging
		var msg = ev.message.replace(/^Uncaught ([_\$\w]+: )?/i,''); 
		
		if (/^AssertionError:/.test(msg) ){
			worker.postMessage({type:'AssertionError', error: {type: 'AssertionError', message: msg} });
			return;
		}
		
		// give node chance to handle it.
		worker.postMessage({type:'uncaughtException', error: {type: ev.type, message: msg} });
	}
	
	// start it
	worker.postMessage({type: 'start', file: file});
	
}

function getFileContent(path){
	var content = '', ok=true;
	var xhr = new XMLHttpRequest();
	
	xhr.addEventListener('load',function(ev){
		content = this.responseText;
	}, false);
	xhr.addEventListener('error',function(ev){
		console.info('error ', path, arguments);
		ok = false;
	}, false);
	
	try{
		xhr.open('GET',path, /* async */null);
		xhr.send();
	} catch(e){
		// likely a file not found
		ok = false;
	}
	return ok && content;
}

//run tests

QUnit.module("simple");
runTests(simple);

