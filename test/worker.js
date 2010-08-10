/*
 * worker.js
 * 
 * - sets up node.js env
 * - communicates with host 
 * - handles errors and uncaught exceptions
 * - fires off tests
 *   
 * copyright (c) 2010 Moos
 * http://github.com/moos
 */

worker = self; // aliase

if (typeof console == 'undefined') {
	console = {};
	console.log =  console.info = console.warn = console.error =	function(){
			postMessage({
				type:'log', 
				message: (QUnit && QUnit.jsDump.parse(arguments) ) 
					|| JSON.stringify(Array.prototype.slice.call(arguments)) 
				});
		}
}
if (typeof alert == 'undefined') {
	alert = console.log;
}
QUnit = null;

process = {
	argv: ['node','testrunner.js'],	// node loads testrunner.js
	env : {
		NODE_DEBUG : 14,
		NODE_PATH :  '../lib/node/lib'
	}
};	
importScripts('../lib/soup/soup-base-2.js');	// this is sync!


// handle messages from host
self.onmessage = function(ev){
	var data = ev.data;

	if (data.type == 'start') {
		console.log('starting ' + data.file);
		
		runTest(data.file);	 // in testrunner.js
		
	} else if (data.type == 'uncaughtException') {

		handleUncaughtException(data.message);

	} else {
		postMessage({type:'fatal' , message : 'unknown worker message type!' });
	}
}

worker.handleUncaughtException = function(msg){

	if (/^AssertionError:/.test(msg) ){
		worker.handleAssertError(msg, true);
		return;
	}
	
	// exception may have occured before our exit handler, so add it here 
	if ( ! worker.listenerAdded) { 
		process.addListener('exit', worker.exitListener);
		worker.listenerAdded = true;
	}

	var handled = false;
	try {
		handled = process.emit('uncaughtException', new Error(msg));
		console.log('handled? ', handled);

	} catch(e) { // rethrown
		msg = e;
	}

	if (handled === false) {
		postMessage({type:'error' , message: ''+msg });
		workerDone();
		return;
	}
	
}

worker.handleAssertError = function(msg, async) {
	if (async) {
		var c = worker.getCounter();
		c && postMessage({type:'data' , message:  c + ' previous (silent) assertions passed' });
		worker.resetCounter();
	}
	postMessage({type:'error' , message: ''+msg });
	workerDone();
}




// crashes FF!!!!!!!
_onerror = function(ev) {
	
	console.log('>>>>>>>>>>> error in worker', ev);
	
	return true;
}