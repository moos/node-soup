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
				msg: (QUnit && QUnit.jsDump.parse(arguments) ) 
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
		NODE_DEBUG : 0,
		NODE_PATH :  '../deps/node/lib/'
	}
};	
importScripts('../lib/soup-base-2.js');	// this is sync!


// handle messages from host
self.onmessage = function(ev){
	var data = ev.data;

	if (data.type == 'start') {
		console.log('starting ' + data.file);
		
		runTest(data.file);	 // in testrunner.js
		
	} else if (data.type == 'AssertionError') {
		
		postMessage({type:'error' , msg : new Error(data.error.message) });
		workerDone();

		
	} else if (data.type == 'uncaughtException') {
		console.log('have error', data.type, data.error.message, data);
		var handled = false;
		try {
			handled = process.emit(data.type, new Error(data.error.message));
			
			console.log('handled? ', handled);
			
			if (handled === false) {
			//	postMessage({type:'fatal', msg: data.error.message });
			}
		} catch(e) {

			console.log('no handler or rethrown', e);

			postMessage({type:'error' , msg : new Error(e) });
			
			postMessage({type:'done', count: null});
			// close the worker
			worker.close();			
		}
	}
}

// crashes FF!!!!!!!
_onerror = function(ev) {
	
	console.log('>>>>>>>>>>> error in worker', ev);
	
	return true;
}