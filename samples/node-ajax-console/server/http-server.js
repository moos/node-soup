

var
	repl = require('repl'), 
	net = require("net"),
	http = require("http"),
	url = require("url"),
	qs = require("querystring"),
	prompt = 'node> ',
	unix_socket_path = "/tmp/node-repl-sock-",
	last;

var PORT = 8080;

var sessions = {};//{123: 'session 123'};


var server = http.createServer(function (req, res) {
	
	var data = {},
		session = null,
		cmd = url.parse(req.url).pathname;
	
	console.log(req.method + " -- command was " + cmd);
	  
	if (cmd == '/') {	// new session
		var sessId = +new Date();

		session = new Session(sessId);
		session.response = res;
		
		// cache session
		sessions[sessId] = session;
		
		// nothing else to do here
		return;
		
	} else if (/^\/a\//.test(cmd)) {	// action command
		var match = cmd.match(/^\/a\/(\d+)/);
		
		console.log(match);
		
		if (match && (id = match[1]) && id in sessions) {
			session = sessions[id];
			
			// we'll respond later (after receiving post body and repl response!)
			// create closure on response

			//data.ok = true;
			
			// must enter busy loop to capture REPL data and send in response
//			return;
			
		} else {	// no session id match
			data.error = 'session id does not match'
		}
			
	}
	
	req.addListener('data', function(chunk){
		if (!session) return;
		console.log(session + '  === server got data: ' + chunk);
		// write to repl server
		session.send(chunk);
		
	});
	if (00000) req.addListener('end', function(){
		console.log('server got end: ');
	});
	
	if (session) {
		// let session server handle the response
		session.response = res;
		return;
	}
	
	res.writeHead(200, {"Content-Type": "application/json"});
	res.write( JSON.stringify(data) );
	res.end();

});
server.listen(PORT);



var client = http.createClient(PORT);
//client.setEncoding("utf8");
var req = client.request('GET', '/').addListener('response', function(res) { 

	var data = null; 
	res.addListener('data', function(chunk) {
		console.log('client req 1 got ' + chunk);
		data = JSON.parse(chunk);

		if (data.error) return;
		
		var req = client.request('POST', '/a/'+data.id);
		req.addListener('response', function(res) {

		//  res.setEncoding("utf8");
		  res.addListener('data', function(chunk) {
			  console.log('client req got ' + chunk);
		  });
		  
		  res.addListener('end', function() {
		  
		  });
		});
		
		req.write('process');
		req.end();

	});
	
	res.addListener('end', function() {
		console.log('client req 1 end ' + data);
	});
	
	return;
	
});
req.end();



process.addListener("exit", function () {

});


function Session(id){ 
	
	var self = this;
	
	// this is used to respond to console client request
	this.response = null;
	this.id = id; 
	this.init = true;
	
	
	this.server = net.createServer(function (socket) {
	
		console.log(11111 + ' repl listening on socket ' + socket)
		socket.addListener("end", function () {
			socket.end();
	    });
		
	    repl.start(prompt, socket);
	  });

	var socket_path = unix_socket_path + id;
	this.server.listen(socket_path);
	
	var client = null;
	
	function createClient() {
		
		console.log('creating client  on ' + socket_path);
		
		client = net.createConnection(socket_path);
		client.addListener('connect', function(){
			
			console.log('net client connected ');
		});
		client.addListener('data', function(chunk){
			
//			if ( ! self.response) return;
//			console.log('net client data ' + chunk);
			
			// first time, we send the id as well as the repl response (as json)
			if (self.init) {
				self.response.writeHead(200, {"Content-Type": "application/json"});
				self.response.write( JSON.stringify({id: self.id, data: ''+chunk}) );
				self.response.end();
				self.init = false;
				return;
			}
			
			self.response.writeHead(200, {"Content-Type": "text/plain"});
			self.response.write( chunk );
			self.response.end();			
		});
		
	}
	process.nextTick(createClient);
	
	this.send = function(data){
		
		console.log('writing data to repl : ' + data);
		
		if (!client) throw '123'; // createClient();
		client.write(data);
		client.end();
	};
}
//Session.prototype = 

