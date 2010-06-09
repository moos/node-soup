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
				+ ' file-read-noexist #file-write-stream'
				+ ' #fs-chmod fs-error-messages #fs-fsync fs-read-buffer fs-read fs-readfile-empty fs-stat'
				//+ ' #http-1.0 http-304 http-cat #http-1.0'
				)
				.split(' ')
				//.reverse().slice(0,1)		// TEMP: run last for now!!!
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


