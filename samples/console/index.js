

console.log('console started', arguments);
console.log(document, document.getElementById('eout'));


var sys = require("sys"),
  assert = require('assert'),
  net = require("net"),
  repl = require("repl"),
  message = "Read, Eval, Print Loop",
  socket_path = "/tmp/node-repl-sock",
  prompt = "node> ",
//  prompt = "<span class='prompt'>node> </span>",
  repls, server, client, timer;

var	eout = document.getElementById('eout'),
	ein = document.getElementById('ein');

print("Type \'.help\' for options\n");
ein.focus();

function print(msg){
	eout.innerHTML += msg.replace(/\n/g,'<br/>');
	eout.scrollTop = eout.scrollHeight;
}

server = net.createServer(function (socket) {
    assert.strictEqual(server, socket.server);
    assert.strictEqual(server.type, 'unix');

	socket.addListener("end", function () {
		socket.end();
	});

    repls = repl.start(prompt, socket);
//    repls.context.message = message;

    console.log(repls);

    window.repls = repls;
    
    repls.rli.history = [];
    repls.rli.historyIndex = -1;
    repls.rli.line = '';

});

server.addListener('listening', function () {
	var read_buffer = "";
	
	client = net.createConnection(socket_path);
	
	client.addListener('connect', function () {
	  assert.equal(true, client.readable);
	  assert.equal(true, client.writable);
	});
	
	client.addListener('data', function (data) {
		  read_buffer += data.asciiSlice(0, data.length);
		  
//		  console.log("Unix data: " + JSON.stringify(read_buffer));
		  
		  print(read_buffer);
			
		  if (read_buffer.indexOf(prompt) !== -1) {
		    read_buffer = "";
		  }
		  else {
		    console.log("didn't see prompt yet, bufering.");
		  }
	});
	
	client.addListener("error", function (e) {
		throw e;
	});
	
	client.addListener("close", function () {
	      server.close();
	});

});	// listening 


server.listen(socket_path);

var history = [], cursor = 0;

document.getElementById('form').addEventListener('submit',function(ev){
	
	client.write( ein.value );
	
	if (ein.value !== '') {
		history.push(ein.value);
		cursor = history.length;
	}
	
	print(ein.value + '\n');
	ein.value = '';
	
	ev.preventDefault();
	ev.stopPropagation();
	return false;
}, false);

document.getElementById('ein').addEventListener('keypress',function(ev){

	var dir = 0;
	if (ev.keyCode == 38)	// up
		dir = -1;
	else if (ev.keyCode == 40) // down
		dir = +1;
	else 
		return;
	
	var next = cursor+dir;
	if (next >= 0 && next < history.length) {
		ein.value = history[next];
		cursor = next;
		ev.preventDefault();
		ev.stopPropagation();
		return false;
	}
	
	if (next == history.length) {
		ein.value = '';
		++cursor; 
	}
	
}, false);

window.clear = function(){
	eout.innerHTML='';
	print("Type \'.help\' for options\n" + prompt);
	ein.focus();
	return false;
}
//process.exitAfter(3000);
