// debugger;
// alert('index.js');


//require('./deps/node/test/simple/test-repl');

//require('./test/tests/node/test/simple/test-byte-length');


//require('./test/tests/node/test/simple/test-http-cat');
//return;



http = require("http");

var PORT = 80;


//http.cat("http://localhost:"+PORT+"/geek/node-soup/index.js", "utf8", function (err, content) {
  http.cat("/geek/node-soup/index.js", "utf8", function (err, content) {
//	http.cat("http://www.yahoo.com/", "utf8", function (err, content) {
	  
	  debugger;
	  
    if (err) {
      throw err;
    } else {
      console.log("got response");
    }
  });


  