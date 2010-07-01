require("../common");
net = require("net");
http = require("http");
url = require("url");
qs = require("querystring");

var request_number = 0;
var requests_sent = 0;
var server_response = "";
var client_got_eof = false;

http.createServer(function (req, res) {
  res.id = request_number;
  req.id = request_number++;

  
  console.log('........',  res.id, req.method)
  
  
  if (req.id == 0) {
    assert.equal("GET", req.method);
    assert.equal("/hello", url.parse(req.url).pathname);
    assert.equal("world", qs.parse(url.parse(req.url).query).hello);
    assert.equal("b==ar", qs.parse(url.parse(req.url).query).foo);
  }

  if (req.id == 1) {
    error("req 1");
    assert.equal("POST", req.method);
    assert.equal("/quit", url.parse(req.url).pathname);
  }

  if (req.id == 2) {
    error("req 2");
    assert.equal("foo", req.headers['x-x']);
  }

  if (req.id == 3) {
    error("req 3");
    assert.equal("bar", req.headers['x-x']);
    this.close();
    error("server closed");
  }

  setTimeout(function () {
    res.writeHead(200, {"Content-Type": "text/plain"});
    res.write(url.parse(req.url).pathname);
    res.end();
  }, 1);

}).listen(PORT);

var c = net.createConnection(PORT);

c.setEncoding("utf8");

c.addListener("connect", function () {
  c.write( "GET /hello?hello=world&foo=b==ar HTTP/1.1\r\n\r\n" );
  requests_sent += 1;
});

c.addListener("data", function (chunk) {
  server_response += chunk;

  if (requests_sent == 1) {
    c.write("POST /quit HTTP/1.1\r\n\r\n");
    requests_sent += 1;
  }

  if (requests_sent == 2) {
    c.write("GET / HTTP/1.1\r\nX-X: foo\r\n\r\n"
           +"GET / HTTP/1.1\r\nX-X: bar\r\n\r\n");
    c.end();
    assert.equal(c.readyState, "readOnly");
    requests_sent += 2;
  }

});

c.addListener("end", function () {
  client_got_eof = true;
});

c.addListener("close", function () {
  assert.equal(c.readyState, "closed");
});

process.addListener("exit", function () {
  assert.equal(4, request_number);
  assert.equal(4, requests_sent);

  var hello = new RegExp("/hello");
  assert.equal(true, hello.exec(server_response) != null);

  var quit = new RegExp("/quit");
  assert.equal(true, quit.exec(server_response) != null);

  assert.equal(true, client_got_eof);
});


setTimeout(function(){ process.exit(-1) },3000)