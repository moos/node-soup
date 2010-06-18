if (typeof console == 'undefined') {
	console = {};
	console.log =  
	console.info =  
	console.warn =  
	console.error =
		function(){
			postMessage({type:'log', msg: JSON.stringify(Array.prototype.slice.call(arguments)) });
		}
}
if (typeof alert == 'undefined') {
	alert = console.log;
}

process = {};
process.argv = [];
process.argv[1] = 'testrunner.js';	// loaded by node
process.env = {};
process.env.NODE_DEBUG = 0;		// this must be set before loading node

importScripts('../lib/soup-base-2.js');	// this is sync!


console.log('hi ' , typeof global, typeof require, ''+module , typeof QUnit);

onmessage = function(ev){
	var data = ev.data;
	if (data.start) {
		
		console.log('starting ' + data.file);

		runTest(data.file);
	}
}

