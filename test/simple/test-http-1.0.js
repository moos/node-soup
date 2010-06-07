require("../common");
net = require("net");
http = require("http");

var body = "hello world\n";
var server_response = "";
var client_got_eof = false;

//debugger;


var server = http.createServer(function (req, res) {

	//sdebugger;

  assert.equal('1.0', req.httpVersion);
  assert.equal(1, req.httpVersionMajor);
  assert.equal(0, req.httpVersionMinor);
  res.writeHead(200, {"Content-Type": "text/plain"});
  res.end(body);
})
server.listen(PORT);

var c = net.createConnection(PORT);

c.setEncoding("utf8");

c.addListener("connect", function () {
	
	var msg = '';
  msg += "GET / HTTP/1.0\r\n" ;
  msg += "Header: head1\r\n";
  msg +=  "\r\n\r\n" ;
  
  c.write( msg );
});

c.addListener("data", function (chunk) {
//	debugger;
  puts(chunk);
  server_response += chunk;
});

c.addListener("end", function () {		// not getting called!!!!
	debugger;
  client_got_eof = true;
  c.end();
  server.close();
});
c.addListener("timeout", function () {
	debugger;
	client_got_eof = true;
	c.end();
	server.close();
});
c.addListener("close", function () {
	debugger;
	client_got_eof = true;
	c.end();
	server.close();
});

process.addListener("exit", function () {
	debugger;
  var m = server_response.split("\r\n\r\n");
  assert.equal(m[1], body);
  assert.equal(true, client_got_eof);
});
