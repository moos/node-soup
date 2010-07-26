// debugger;
// alert('index.js');


//require('./deps/node/test/simple/test-repl');

//require('./test/tests/node/test/simple/test-byte-length');
//require('./test/tests/node/test/simple/test-pump-file2tcp');



http = require("http");

var PORT = 80;


  http.cat("http://localhost:"+PORT+"/", "utf8", function (err, content) {
	  
	  debugger;
	  
    if (err) {
      throw err;
    } else {
      console.log("got response");
    }
  });


  