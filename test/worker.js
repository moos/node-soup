if (typeof console == 'undefined') {
	console = {};
	console.log =  
	console.info =  
	console.warn =  
	console.error =
		function(){
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
process = {};
process.argv = [];
process.argv[1] = 'testrunner.js';	// loaded by node
process.env = {};
process.env.NODE_DEBUG = 0;		// this must be set before loading node

importScripts('../lib/soup-base-2.js');	// this is sync!


//console.log('hi ' , typeof global, typeof require, ''+module , typeof QUnit);

self.onmessage = function(ev){
	var data = ev.data;

	if (data.type == 'start') {
		console.log('starting ' + data.file);
		
		runTest(data.file);
		
	} else if (data.type == 'uncaughtException') {
		console.log('have error', data);
		var handled = false;
		try {
			handled = process.emit(data.type, new Error(data.error.message));
			
			if (handled === false) {
				postMessage({type:'fatal', msg: data.error.message });
			}
		} catch(e) {

			console.log('no handler or rethrown', e);

			postMessage({type:'error' , msg : new Error(e) });
			
			postMessage({type:'done', count: null});
			// close the worker
			close();			
		}
	}
}

// crashes FF!!!!!!!
_onerror = function(ev) {
	
	console.log('>>>>>>>>>>> error in worker', ev);
	
	return true;
}