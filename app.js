// node-soup: app.js

// signature: function (exports, require, module, __filename, __dirname)

//console.log(this, arguments);//require, global, process, module);


var
	simple = {
		path : './test/simple/test-',
		tests : ('assert buffer byte-length #c-ares chdir'
				+ ' #child-process-*'
				+ ' #crypto #delayed-require'
				+ ' #eio-* #error-reporting #eval-cx'
				+ ' event-emitter-add-listeners event-emitter-modify-in-emit event-emitter-remove-listeners'
				+ ' exception-handler #exec'
				+ ' file-read-noexist test-read-stream'
				)
				.split(' ')
				.reverse().slice(0,1)		// TEMP: run last for now!!!
	},
	
	fixtures = {
		path : './test/fixtures/',
		tests : 'a echo exit'.split(' ')
	};



runTests(simple);
//runTests(fixtures);


function runTests(which){
	which.tests.forEach(function(test,index){
		
		if (test[0] == '#') return;	// skip #test!!!!
		
		test = which.path + test;
		try {
			require(test);
		} 
		catch(e) {
			console.warn('test failed: ', test, e);
		}
	})
}



///debugger;


