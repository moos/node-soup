// node-soup test module
// signature: function (exports, require, module, __filename, __dirname)


var
	simple = {
		path  : '../deps/node/test/simple/',
		tests : window._getFileContent('test-node-simple.txt').split(/\r?\n/)
	};



//require(simple.path + 'test-http-1.0'); return;


function runTests(which){
	var hide = false;
	
	which.tests.some(function(name,index){
		var b = parseFileList(name); 
		if (typeof b == 'boolean') return b;
		var file = which.path + name.replace(/.js$/i, ''); // discard .js ext for require()

		// queue up async tests -- start() will run them sequentially
		QUnit.asyncTest(name, function(){

			// run test in worker
			newWorker(file);
		})
	});

	function parseFileList(name){
		if (name.indexOf('#.show') == 0) {hide = false; return false} 
		if (name.indexOf('#.exit') == 0) {return true} 	// skip the rest
		if (name.indexOf('#.hide') == 0) {hide = true}
		if (hide) return false;
		if (/^#?\s+|^\s*$/.test(name)) return false;	// skip blank lines and # comments
		if (name[0] == '#') {							// skip #test 
			QUnit.test(name + ' -- SKIPPED', function(){});
			return false;
		}
		// return nothing continues
	}
}

	
var worker = null;
function newWorker(file) {
	
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
		// uncaught exception!
		console.error('worker onerror:', ev);

		// Clean up message.  chrome adds 'uncaught <classname>: ' to message
		// TODO Firefox sometimes returns blank, 
			// bug: https://bugzilla.mozilla.org/show_bug.cgi?id=512157
			// and: http://www.nczonline.net/blog/2009/08/25/web-workers-errors-and-debugging
		var msg = ev.message.replace(/^Uncaught ([_\$\w]+: )?/i,''); 
		
		// give node chance to handle it.
		worker.postMessage({type:'uncaughtException', error: {type: ev.type, message: msg} });

		return;
		
		
		QUnit.ok(false, ev.message);
		QUnit.start();	// start if it wasn't started by worker

		// force terminate worker
		worker.terminate();
	}
	
	// start it
	worker.postMessage({type: 'start', file: file});
	
}

//run tests

QUnit.module("simple");
runTests(simple);

