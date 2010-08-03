/* node-soup
 * 	
 * 		client-side reclaims node.js
 * 
 * (c) 2010 Moos 
 * http://github.com/moos/node-soup
 *
 * version: super alpha
 */

window = typeof window != 'undefined' ? window
		: typeof self != 'undefined' ? self
		: {};

if (typeof console == 'undefined') console = {log: function(){} };


var 
	process = process || {}, 
	global = self,	// ///
	GLOBAL = global,
	NODE_ROOT;

// defined in /node/deps/v8/src/v8natives.js
if (!Object.keys) {
	Object.keys = function (object) {
	  var results = [];
	  for (var property in object)
		  //if (object.hasOwnProperty(property))
			  results.push(property);
	  return results;
	}
}
if (!Object.defineProperty) {
	Object.defineProperty = function(obj, prop, descriptor){
		if (typeof descriptor.value != 'undefined') obj[prop] = descriptor.value;
		descriptor.get && obj.__defineGetter__(prop, descriptor.get);
		descriptor.set && obj.__defineSetter__(prop, descriptor.set);
	}
}
if (!Object.defineProperties) {
	Object.defineProperties = function( obj, props ) {
		for ( var prop in props ) {
			Object.defineProperty( obj, prop, props[prop] );
		}
	}
}
if (!Object.getOwnPropertyNames) {
	Object.getOwnPropertyNames = function(obj) {
		// limitations: can't access non-enumerable properties
		return Object.keys(obj);
	}
}
// from: http://ejohn.org/blog/ecmascript-5-objects-and-properties/
if (!Object.create) {
    Object.create = function( proto, props ) {
    	  var ctor = function( ps ) {
    	    if ( ps )
    	      Object.defineProperties( this, ps );
    	  };
    	  ctor.prototype = proto;
    	  return new ctor( props );
    };
    	
}
//defined in /node/deps/v8/src/array.js
if (!Array.isArray) {
	Array.isArray = function( array ) {
		  return Object.prototype.toString.call( array ) === "[object Array]";
	}
}


(function(){	/* local scope */
	
	// local vars
	var uid = 2001,
		gid = 3001,
		cwd = '.',
		umask = 0666;
	
	var emptyFunction = function(){},
		global_process = process;

	
function EventEmitter(){}
process = new EventEmitter();		// process is-a EventEmitter (node_events.cc)
	// process.EventEmitter.prototype is extended in events.js
	// with process.addListener & process.removeListener, etc

process.EventEmitter = EventEmitter;	// container to subclass later

process.global = global;
process.version = 'v0.1.100-3-xxxxxx';
process.platform = '1';
process.argv = mixin(['node','index.js'], global_process.argv || []); // argv[1] is main()!
process.env = mixin({
		'HOME' : '/.',
		'NODE_PATH' : 'lib/node/lib',
		'NODE_DEBUG' : 0,
		}, global_process.env || {});

NODE_ROOT = process.env.NODE_PATH.split(':')[0].replace(/\/lib$/,'');

process.ARGV = process.argv;
process.ENV = process.env; 
process.pid = 200; 
process.installPrefix = NODE_ROOT;
process.execPath = NODE_ROOT + '/build/default/node'; 
	
process.loop = function(){
	// block until all events are handled!
	// since we can't block a call in a browser (except by blocking execution through cpu hording)
	// we'll override the process.emit() routine to fire certain events when all io events are done.
	eventLoopTimer = new process.Timer();
	eventLoopTimer.idle = false;
	eventLoopTimer.callback = function(){
		
//		console.log('+++', this.idle, watchers.length);
		
		if ( this.idle && !watchers.length ) {
			this.stop();
			eventLoopIsEmpty();
		}
		eventLoopTimer.idle = watchers.length == 0;
	} 
	eventLoopTimer.start(750,750); 
}
function activeIO(){
	if (eventLoopTimer) eventLoopTimer.idle = false;
}

var waitEvents = [],
	exitCode = 0,
	exitEventIndex = -1,
	eventLoopTimer = null,
	running = true;

process.kill =
process.reallyExit = function(code){
	
	exitCode = code || 0;
	console.log('reallyExit!!!!!!!!', exitCode );
	
	// stop all watchers - stop removes the watcher from the array
	// last watcher removed will trigger wait events
	var len;
	while (len = watchers.length) {
		watchers[len-1].stop();
	};
	running = false;
}
process.emit = function(type /* ,args */){
	var args = pSlice.call(arguments);
	// events to wait until loop() is finished
	if (type == 'exit') {
		
		// don't queue multiple exit events
		if (exitEventIndex >= 0) {
			waitEvents.splice(exitEventIndex,1);
		}
			
		console.log('waiting on exit', waitEvents.length, waitEvents);
		waitEvents.push(args);
		exitEventIndex = waitEvents.length - 1;
		return;
	} 
	// else process event
	return process.EventEmitter.prototype.emit.apply(process,args);
}

// eventLoopIsEmpty is called by IOWatcher class (below) when all watchers have been processed
function eventLoopIsEmpty(){
	// fire wait events
	var event, haveExit = false;
	while (event = waitEvents.shift()) {
		console.info('firing delayed ', event, waitEvents);
		if ((haveExit |= event[0] == 'exit') && event.length == 1)	// add exit code
			event[1] = exitCode;
		
		process.EventEmitter.prototype.emit.apply(process,event);
	}
	if (haveExit) process.mainModule.exited = true;
}

process.unloop = function(){ throw Error("deprecated!") }
process._byteLength = function(string,encoding){ return Buffer.byteLength.call(null,string,encoding) }
process.umask = function(mask){
	if (arguments.length) {
		var old = umask;
		umask = mask;
		return old;
	} else 
		return umask;
}
process.dlopen = function(){
	throw Error("process.dlopen!!");
}

process.chdir = function(path){ cwd = path }
process.cwd = function(){ return cwd }
process.getuid = function(){ return uid }
process.setuid = function(id){ uid = id }
process.setgid = function(id){ gid = id }
process.getgid = function(){ return gid }
process.memoryUsage = function(){ 
	// fake it
	return { rss: 4935680
		, vsize: 41893888
		, heapTotal: 1826816
		, heapUsed: 650472
		}
}
process.EV_MINPRI = -2
process.EV_MAXPRI = 2
process.O_RDONLY = 00000000
process.O_WRONLY = 00000001
process.O_RDWR = 00000002
process.S_IFREG = 0100000
process.S_IFDIR = 0040000
process.S_IFCHR = 0020000
process.S_IFBLK = 0060000
process.S_IFIFO = 0010000
process.S_IFLNK = 0120000
process.S_IFSOCK = 0140000
process.S_IFMT = 0170000

process._needTickCallback = function(n){
	// setTimeout is overriden to call on next heartbeat (tick)
	setTimeout(process._tickCallback,0);
}

// empties / noop
process.checkBreak = 
	emptyFunction;



var natives = null,
	nativeMarker = '::',
	Handles = {},
	NEXT_FD = 3;	// 0 stdin, 1 stdout, 2 stderr

function std_fd(fd, size){
	this.fd = fd;
	size = typeof size == 'undefined' || size < 0 ? 1024 : size;
	this.buffer = new Buffer(size);
	Handles[this.fd] = this;
}
function fd_handle(path,flags,mode){
	this.path = path;
	this.flags = flags;
	this.mode = mode;
	this.fd = NEXT_FD++;
	this.head = 0;
	Handles[this.fd] = this;
}

var Sockets = {};
function socket_handle(){
	this.fd = NEXT_FD++;
	this.reader = this.writer = null;
	this.readable = this.writable = false;
	this.pair = null;	// fd: paird socket (accept'd)
	this.peer = null;	// fd: peer connected to (connect'd)
	this.connection = false;	// connection status
	this.error = 0; 	// success
	this.keepalive = null;
	this.shutdown = {read: false, write: false};
	Sockets[this.fd] = this;
}

// as defined by 'natives' module in node.cc
var NativesList = 'assert buffer child_process dgram dns events file freelist fs http crypto net posix querystring repl sys tcp url utils path module string_decoder';
process.binding = function(module){
	// console.log('binding:',arguments);

	switch (module) {
	case 'natives':
		if (natives) return natives;
		natives = {};		
		NativesList.split(' ').map(function(n){natives[n] = nativeMarker + n + nativeMarker});
		return natives;
		
	case 'fs':
		// generic idle watcher on all fs ops -- probably could be optimized
		activeIO();		

		return {
			// TODO::::: missing many fs bindings!!!!!!!!!
			Stats : Stats,
			stat  : makeStat,
			lstat : makeStat,
			fstat : makeStat,
			open : function(path, flags, mode, callback){
				activeIO();		
				var handle = new fd_handle(path, flags, mode);
				if (callback)
					return defer(callback,/* err */null,handle.fd);

				return handle.fd; 
			},
			close : function(fd, callback){
				activeIO();		
				if (fd in Handles) { 
					delete Handles[fd];
				}
				if (callback)
					defer(callback,/* err */null);
			},
			// read fd at position into buffer at offset
			read : function(fd, buffer, offset, length, position, callback){
				activeIO();		
				var bytesRead = 0, result, err = null,
					handle = Handles[fd];
				if (handle.buffer){
					position = position || 0;
					bytesRead = handle.buffer.copy(buffer,offset,position,position+length);
					// TODO : remove from fd!????? as in STDIN
					
				} else if (handle.head >= 0){	// file
					
					if (!position && position !== 0) position = handle.head;
					result = getFileContent(handle.path, position, length);	// read as utf-8

					// note: bytes read maybe less than length if hit a utf8 boundary!
					if (result instanceof Error) {
						err = result;
					} if (result === -1) {		// eof
						handle.head = -1;
					} else {
						bytesRead = buffer.utf8Write(result,offset);
						handle.head = position + bytesRead;
					}
				}
				if (callback) {
					defer(callback,err,bytesRead);
					return;
				}
				// TODO throw error!!??
				return bytesRead;
			},
			write : function (fd, buffer, offset, length, position, callback){
				activeIO();		
				var	handle = Handles[fd],
					bytesWritten = 0;
				
				position = position || 0;
				// stdin/out haver buffer
				if (handle.buffer) {
					// (target, targetStart, sourceStart, sourceEnd) <- inclusive endpoints
					bytesWritten = buffer.copy(handle.buffer,position,offset,offset+length);
					if (fd == STDOUT.fd ){
						var str = buffer.toString(/* encoding */'', offset, offset+length);
						if (process.mainModule.exports.print)
							process.mainModule.exports.print(str);
						else 
							console.log('STDOUT::'+str+"\n");
					}
				} else {
					// TODO!!! write to FILE!!!
					console.log('TODO: write to FILE!!!!');
					bytesWritten = length;
				}
				if (callback) {
					defer(callback,null,bytesWritten);
					return;
				}
				return bytesWritten;
			},
			unlink : function(){}
			
		}; 
		
	case 'buffer':
		return {Buffer: Buffer};
		
	case 'stdio':
		// TODO stdout/in should be EventEmitter --- streams!!!????
		return {
			stdoutFD: STDOUT.fd, //new Buffer(4096),
			writeError: function(msg){
				if (process.mainModule.exports.writeError)
					process.mainModule.exports.writeError(msg);
				else
					console.log('STDERR::' + msg);
			},
			openStdin: function(){ return STDIN.fd },
			isStdoutBlocking: function(){ return true },
			isStdinBlocking: function(){ return true },
			setRawMode : function(mode){ return mode !== false },
			getColumns : function(){ return 80 }
		};
		
	case 'cares':
		return {
			Channel: Channel,
			isIP : function(arg){
				return	  /(\d+\.){3}\d+/.test(arg) ? 4
						: /^([0-9A-Fa-f]{1,4}:){7}[0-9A-Fa-f]{1,4}$/.test(arg) ? 6
						: /::/.test(arg) ? 6 // ::1
						: 0;
			},
			AF_INET : 2,
			AF_INET6 : 10,
			SOCKET_BAD : -1, // ?
			
			A:1, AAAA:26, MX:15, TXT:16, SRV:33, PTR:12, NS:2,
			// ERROR CODES
			NODATA : 1,		FORMERR : 2,	BADRESP : 10,	NOTFOUND : 4,
			BADNAME : 8,	TIMEOUT : 12,	CONNREFUSED:11,	NOMEM : 15,	
			DESTRUCTION:16,	NOTIMP : 5,		EREFUSED : 6, 	SERVFAIL : 3
		};
		
	case 'http_parser':
		return {
			HTTPParser: HTTPParser,
			urlDecode : decodeURIComponent
		};
		
	case 'net':
		var handle = null, write, read;
		return {
			socket : function(arg,address){
				if (arg == 'unix')
					handle = new socket_handle();
				else // tcp4, tcp6
					// TODO websocket!!!!!
					handle = new socket_handle();
				
				return handle.fd; 
			},
			// bind socket to local address
			bind : function(fd,port,address) {
				handle = Sockets[fd];
				if (port >= 0) {
					handle.port = port;
					handle.address = address || INADDR_ANY;
				} else { // port is a path (string)
					handle.path = port;
					handle.port = port;	// unix socket!
				}
			},
			// enable listen for a connection
			listen : function(fd,backlog){
				handle = Sockets[fd];
				handle.readable = true;
			},
			// connect socket to remote address
			connect : function(fd,remote_port,remote_address) {
				var found = false;
				var handle = Sockets[fd];	// need local scope handle here for closure below
				handle.peer = null;
				
//				if (!/tmp/.test(remote_port)) debugger;
				
				// see if remote peer is listening
				if (1111 ||  remote_port >= 0) { // it's a port
					
					for (var k in Sockets){
						var remote = Sockets[k];
						found = remote.readable						// peer is listening
							&& remote.port == remote_port			// ports match
							&& (remote.address == INADDR_ANY		// peer listens on ANY IP 
								|| remote.address == remote_address);// or IPs match
						if (found){
							handle.peer = remote.fd;
							handle.error = EINPROGRESS;			// in progress until peer accept()'s
							break;
						}
					}
					if (!found) {	// No local (node.js) servers listening on the remote address. http://linux.die.net/man/2/connect
									// check for other local or remote servers 

//						debugger;
						
						var loc = null;
						if (window 
								&& (loc = window.location) 	// yes it's an assignment!
								&& (remote_address == loc.hostname || remote_address == INADDR_ANY) 
								&& remote_port == (loc.port || 80)
								) {

							var server = ServerFactory(remote_port, remote_address);
							if ( server.fd ) {
								handle.peer = server.fd;
								handle.error = EINPROGRESS;			// in progress until peer accept()'s
							} else {
								// new server, may not have fd yet (async)
								process.nextTick(function(){
									handle.peer = server.fd;
									handle.error = EINPROGRESS;			// in progress until peer accept()'s
									handle.writable = true;
								});
								return;
							}
						
						} else {
							// no same-domain server OR remote server (not supported via AJAX)
							// TODO hanlde CORS (cross origin resource sharing!) or other XS methods
							handle.error = ECONNREFUSED;
						}
					}
					// mark as writable: see net.js, line 731
					// triggers write watcher which checks error state to see if connection has been accept()'d
					handle.writable = true;
				} else { // port is a path (string)
					// TODO
					throw 'TODO connect to unix socket';
					handle.path = remote_port;
				}
			},	
			// accept a pending connection on fd
			accept : function(fd){
				handle = Sockets[fd];
				// who is trying to connect?
				for (var k in Sockets){
					var remote = Sockets[k];
					if (remote.peer == fd && ! remote.connected){ // prevent multiple connections
						remote.connected = true;

						// make new peer socket and pair them!! 
						var peer = new socket_handle();
						peer.reader = remote.writer = new ioBuffer();
						peer.writer = remote.reader = new ioBuffer();
						peer.pair = remote.fd;
						remote.pair = peer.fd;
						
						remote.error = 0;	// triggers success (connected) on remote
						return {  // peerInfo
							fd		: peer.fd,
							port	: remote.port,
							address	: remote.address 
						}
					}
				}
				return null;
			},			
			close : function(fd){
				console.log('close socket fd',fd, 'peer,pair', Sockets[fd].peer, Sockets[fd].pair);
				if (fd in Sockets) {
					handle = Sockets[fd];
					// last paired socket to close io buffers
					if (!handle.pair || !(handle.pair in Sockets)) {
						delete handle.reader;
						delete handle.writer;
					} else {
						// emit peer end()
						var peer = Sockets[handle.pair];
						// mark it readable to kick off socket's readwatcher
						defer(function(){ peer.readable = true });
						// writable ??????
					}
					if (handle.keepalive) {
						handle.keepalive.stop();
						delete handle.keepalive;
					}
					delete Sockets[fd];
				}
				return 0; // success
			},
			shutdown : function(fd,how){
				if (fd in Sockets){
					handle = Sockets[fd];
					how = how || 'write';  // default: see node_net2.cc 
					if (how == 'write' || how == 'readwrite') {
						handle.writable = false;
						handle.shutdown.write = true;
						if (!handle.shutdown.read){	// trigger reader
							var h = handle;
							setTimeout(function(){ h.readable = true }, TICK_INTERVAL);
						}
					}
					if (how == 'read'  || how == 'readwrite') {
						handle.readable = false;
						handle.shutdown.read = true;
//						if (!handle.shutdown.write) handle.writable = true;	// trigger writer
					}
					// halt keepalive if shutdown both r/w
					if (handle.keepalive && handle.shutdown.read && handle.shutdown.write) {
						handle.keepalive.stop();
						handle.keepalive = null;
					}
				}
				return 0; // success
			},
			socketError : function(fd){
				return Sockets[fd].error;
			},
			// read from fd into buffer: offset & length refer to buffer
			read : read = function(fd, buffer, offset, length){
				
				//if (fd != 7 ) debugger;
				
				if (!(fd in Sockets)) throw 'fd not in socket for read: ' + fd;
				if ( !length ) return 0; 
				handle = Sockets[fd];
				
				var bytesRead = handle.reader.read(buffer, offset, length);
				handle.readable = !handle.reader.isEOF() || handle.shutdown.write;
				return bytesRead;
			},
			// write to fd from buffer: offset & length refer to buffer
			write : write = function(fd, buffer, offset, length){
				
//				debugger;
				
				if (!(fd in Sockets)) throw 'fd not in socket for write: ' + fd;
				if (!length) return 0;
				handle = Sockets[fd];

				var bytesWritten = handle.writer.write(buffer, offset, length); 
				// mark its pair readable
				if (handle.pair && (handle.pair in Sockets)) { 
					var pair = Sockets[handle.pair];
					pair.readable = true;
				}
				return bytesWritten;
			},
			errnoException : function(errno, syscall){
				return new Error('errnoException: errno='+errno+', syscall='+syscall);
			},
			sendMsg : write, //function(fd, buffer, offset, length, fd_to, flags) {},
				// TODO flags!

			recvMsg		: read,
			getsockname : function(fd){
				if (!(fd in Sockets)) throw 'fd not a socket: ' + fd;
				handle = Sockets[fd];
				return handle.address || handle.path; 
			},
			setKeepAlive: function(fd,enable,interval){
				if (!(fd in Sockets)) throw 'fd not a socket: ' + fd;
				var handle = Sockets[fd];	// use var here to get closure on handle!
				if (enable) {
					var KEEPALIVE = 7200;	// 2 hrs default timeout
					if (! handle.keepalive) {
						handle.keepalive = new process.Timer();
						handle.keepalive.callback = function(){
							
							console.log('keep alive ----------- ', fd, handle, handle.fd, handle.readable, interval);
							
							// send fake ACK! on fd and its pair
							handle.readable = true;
							if (handle.pair && handle.pair in Sockets) {
								var pair = Sockets[handle.pair];
								pair.readable = true;
							}
						}
						interval = interval || KEEPALIVE; // seconds
					} else {
						interval = interval || (handle.keepalive.repeat  / 1000); 
					}
					handle.keepalive.again(1000 * interval);
				} else if (handle.keepalive) {
					handle.keepalive.stop();
					handle.keepalive = null;
				}
				return 0;
			},
			setNoDelay  : function(){
				console.log(' TODO setNoDelay........................')
			},

			// TODO................
			toRead      : throwTODO('toRead'), 
			getpeername : throwTODO('getpeername'),
			socketpair	: throwTODO('socketpair'),
			pipe		: throwTODO('pipe'),
			sendFD		: throwTODO('sendFD'),
			
			// err no's are system dependent... but we don't care since
			// everything happens here!
			EINPROGRESS : EINPROGRESS,	// "Operation now in progress"
			ECONNREFUSED: ECONNREFUSED,	// "Connection refused"
			ENOENT      : ENOENT,		// "No such file or directory"
			EMFILE      : EMFILE		// "Too many open files"
		};
	
	case 'evals':
		return {Script: Script};
		
	case 'signal_watcher':
	case 'child_process':
	case 'crypto':
	default:
		throw new Error('process.binding: No such module: ' + module);
	}
};

function throwTODO(name){ return function(){ throw new Error(' @@ TODO @@ ' + (name || '')) }}

var EINPROGRESS = 36,
	ENOENT = 2,
	EMFILE = 24,
	ECONNREFUSED = 61;

var INADDR_ANY = '0.0.0.0';

var servers = {};

function ServerFactory(port,address) {
	
	var name = address+":"+port;
	if (!(name in servers)) 
		servers[name] = makeServer();
	
	return servers[name]; 

	// psuedo server
	function makeServer() {
		var http = nodeSoup.loadModule('http');
		var server = http.createServer(function (req, res) {
			console.log('req on psuedo server');
			var result = '',
				xhr = new XMLHttpRequest();
			
			xhr.addEventListener('load',function(ev){
				var headers = {}, 
					h = this.getAllResponseHeaders().split(/\r?\n+/);
				for (var i=0, l=h.length; i<l; i++){
					if (trim(h[i]) == '') continue;
					var parts = splitOnFirst(h[i],':'),
						key = parts[0],
						value = trim(parts[1]);
					headers[key] = value;
				}
				res.writeHead(this.status, this.statusText, headers);
				res.end(this.responseText /*, enc */);			
			}, false);
	
			xhr.addEventListener('error',function(ev){
				throw new Error(this.statusText); 
			}, false);
	
			try{
				var url = req.url;
				if (address != INADDR_ANY) {
					if (port != 80) url = ":"+port+url;
					url = "http://" + address + url; 
				}
					
				xhr.open(req.method, url, /* async */true);

				// set headers
				for (var key in req.headers){
					xhr.setRequestHeader(key, req.headers[key]);
				}
				xhr.send();
				
			} catch(e){
				throw e;
			}
			
		});
		server.listen(port, address, function(){
			console.log('pseudo server accepted conn on %d %d', port, address);
		});
		
		return server;
	};
}

/*
 * HTTPParser
 */
var CRLF = "\r\n";
function HTTPParser(type){
	this.reinitialize(type);
}
HTTPParser.prototype = {}
HTTPParser.prototype.execute = function(buffer, offset, length){
	
	
//	if (length > 80) debugger;
	
	
	if (length <= 0) { 
		invoke('onMessageBegin');
		invoke('onMessageComplete');
		return 0;
	}
		
	var	parser = this,
		data = buffer.toString('utf-8',offset,offset+length),	// enc??
		entity = splitOnFirst(data,CRLF+CRLF),
		bytesParsed = 0;
	
	while (entity.length) {

//		console.log(666666, entity.length, entity[0]);
		invoke('onMessageBegin');
		
		var	chunked = false,
			header = entity.shift(),
			lines = header.split(CRLF),
			line1 = lines.shift(),
			info = {}, 
			headers = [],
			contentLength = null,
			parts
			;

		if (trim(header) == '' ){
			// may have been part of previous chunked data
			bytesParsed += header.length + 2 * CRLF.length;
			continue;
		}
		
		// first line is the request/response line
		parts = line1.split(/ +/);
		if (this.type == 'request') {
			// eg: "GET /path/file.html HTTP/1.0"
			info.method = parts[0].toUpperCase();
			invoke('onURL', parts[1]);
			var url = nodeSoup.loadModule('url').parse(parts[1]);
			if (url.pathname) invoke('onPath', url.pathname);
			if (url.query) invoke('onQueryString', url.query);
			if (url.hash) invoke('onFragment', url.hash.substring(1));	// drop the #
			parseVersion(parts[2]);
		} else {	// response
			// eg: "HTTP/1.0 200 OK"
			parseVersion(parts[0]);
			info.statusCode = parseInt(parts[1],10);
		}
		
		// rest of headers
		parseHeaders(lines);
	
		// push headers
		for (var i in headers) {
			var h = headers[i];
			invoke('onHeaderField', h[0]);
			invoke('onHeaderValue', h[1]);
		}
		invoke('onHeadersComplete',info);
		bytesParsed += header.length + 2 * CRLF.length;
	
		// empty body?
		var body = '';
		if (chunked || contentLength || (entity.length && !entity[0].length))
			body = entity.shift();
		
		if (contentLength) // this is the octet length
			body = body.substr(0,contentLength);	// TODO enc????
			
		// exit the rest if upgrade
		if  (info.upgrade){
			invoke('onMessageComplete');
			bytesParsed -= 1; /* http.js line 617 */		// TODO !!!!!!???
			//continue;
			return bytesParsed;
		}
		
		// parse body
		// TODO multipart content 
		// see: http://github.com/felixge/node-formidable/blob/master/lib/formidable/multipart_parser.js
		if (chunked){
			// size[;hex] CRLF chunk CRLF size[;] CRLF 0 CRLF footer CRLF footer CRLF ...
			var sizeLine, chunkSize;
			parts = body.split(CRLF);
			while (parts.length){
				sizeLine = parts.shift();
				chunkSize = parseInt(sizeLine,16);
				bytesParsed += sizeLine.length + CRLF.length;
				if (chunkSize == 0) break;
	
				invoke('onBody', buffer, offset + bytesParsed, chunkSize);
				// eat chunk
				parts.shift(); // discard string rep
				bytesParsed += chunkSize + CRLF.length;
			}
			// TODO? more headers?
			if (0000 && parts.length) {
				debugger;
				throw 'TODO support chunked encoding footers';
			}
				// & send headers here...
	
		} else {			
			var len = parseInt(contentLength === null ? body.length : contentLength, 10);
			invoke('onBody', buffer, offset + bytesParsed, len);		// byte length or char length????????????
			bytesParsed += len;
		}
		// done!
		invoke('onMessageComplete');
		
		if (bytesParsed < length) {
			var data = buffer.toString('utf-8',offset + bytesParsed, offset +length),	// enc??
			entity = splitOnFirst(data,CRLF+CRLF);
		}
	}	// while
	
	return bytesParsed;

	
	/* parser internal functions */
	
	function invoke (handler, arg) {
		if (!(handler in parser)) return;
		if (typeof arg == 'string') {
			var b = new Buffer(arg); // pass strings as buffer
			parser[handler].call(parser, b, 0, b.length);
		} else if (typeof arg == 'undefined') {
			parser[handler].call(parser);
		} else {
			parser[handler].apply(parser, pSlice.call(arguments,1) );
		}
	}
	function parseVersion(str){
		var v = str.match(/HTTP\/(\d+)\.(\d+)/);
		info.versionMajor = parseInt(v[1],10) || 1;
		info.versionMinor = parseInt(v[2],10) || 0;
	}
	function parseHeaders(lines){
		var parts, field = value = '', connection_close_flag = false;
		for (var i=0, l=lines.length; i<l; i++){
			var line = lines[i];
			// line beginning with space or tab is part of previous header
			if (/ |\t/.test(line[0])) {
				value += ' ' + trim(line);
				continue;
			}
			if (value) {
				headers.push([field,value]);
				field = value = '';
			}
			// eg, "Content-Type: text/html"
			parts = splitOnFirst(line,':');
			field = trim(parts[0]).toLowerCase();
			value = trim(parts[1] || '');
			
			switch (field){
			case 'content-length' : 
				contentLength = value; 
				break;
			case 'upgrade' : 
				info.upgrade = true; 
				break;
			case 'connection' : 
				if (/keep-alive/i.test(value)) 
					info.shouldKeepAlive = true;
				else
					connection_close_flag = true;
				break;
			case 'transfer-encoding' :
				if (/chunked/i.test(value))
					chunked = true;
				break;
			}
		}
		if (value) headers.push([field,value]);
		// handle keep-alive per node/deps/http_parser/http_parser.c : http_should_keep_alive()
		if (!info.shouldKeepAlive)
			info.shouldKeepAlive = http_should_keep_alive(connection_close_flag) ? true : false; 
	}
	function http_should_keep_alive(connection_close_flag) {
		if (info.versionMajor > 0 && info.versionMinor > 0) {
			/* HTTP/1.1 */
			return connection_close_flag ? 0 : 1;
		} else {
			/* HTTP/1.0 or earlier */
			return info.shouldKeepAlive ? 1 : 0;
		}
	}
}
HTTPParser.prototype.finish = function(){
	//throw 'was i supposed to do somptin with it!?';
}
HTTPParser.prototype.reinitialize = function(type){
	if (! /^(request|response)$/.test(type)) throw new Error("Argument be 'request' or 'response'");
	this.type = type;
}

// TODO See: paperboy's streamFile http://github.com/felixge/node-paperboy/blob/master/lib/paperboy.js
// to serve files over http!


/*
 * Timer process.Timer is used by net.js and dns.js as well as to define global.<timer>
 * functions @ref: http://search.cpan.org/~mlehmann/EV-3.8/libev/ev.pod
 * 
 * TODO: handle drift (don't trigger more often than 'repeat') 
 */
process.Timer = function(){
	this.calllback = null;
	var repeat = 0,
		timer = null,
		self = this;
	
	function cb() {
		if (typeof self.callback != 'function')
			throw new Error('timer callback not a function');
		if (repeat > 0)
			timer = setTimeout( cb, repeat);
		else 
			timer = null;
		
		self.callback();
	}
	// values in msec
	self.start = function(after, repeat_){
		if (arguments.length != 2) throw new Error('Bad arguments');
		repeat = repeat_;
		if (after >= 0) {
			timer = setTimeout(cb, after || repeat);
		} 
		// important else: if after was triggered, it will trigger repeat
		else if (repeat > 0) {
			timer = setTimeout(cb, repeat);
		}
	}
	self.stop = function(){
		if (!timer) return;
		clearTimeout(timer); 
		timer = null;
	}
	self.again = function(repeat_){
		self.stop();
		if (typeof repeat_ != 'undefined')
			repeat = repeat_;
		if (repeat > 0)
			self.start(0,repeat);
	}
	Object.defineProperty(self, "repeat", { 
		get: function() { return repeat },
		set: function(val) { repeat = val }
	});
}

/*
 * IOWatcher
 */
var watchers = [];

process.IOWatcher = (function(){
	var timer = null;
	
	function poll(){		
		if (!watchers.length) return;
		var w, next = 0;

		while (next < watchers.length) {
			w = watchers[next];
			next++;
			
			var fd = w.__fd, haveData = false, handle=null;
			if (fd in Handles) {
				// TODO ??
				handle = Handles[fd];
				console.log('watcher >>>>> fd in Handle ', fd);
				
			} else if (fd in Sockets) {
				handle = Sockets[fd];
				haveData = (w.__isReadable && !handle.shutdown.read && handle.readable )
						|| (w.__isWritable && !handle.shutdown.write && handle.writable );
			} else {
				// socket must have closed -- shutdown watchers!! 
				// TODO  is this safe????
				console.log(' >> %d is closed - auto shutdown watcher', fd);
				w.stop();
				//return;
			}
			if (0) console.log(next, watchers.length,'--- watching w, fd, havedata: ',  fd
					, w.__isReadable ? 'readable' : (w.__isWritable ? 'writable' : 'X')
					, haveData
					, 'R', handle.reader && handle.reader.amount()
					, 'W', handle.writer && handle.writer.amount()
					);
			if (haveData && w.callback && handle) {
 				deferNow(bindTo(w,w.callback), handle.readable, handle.writable);
 				//				w.callback.call(w, handle.readable, handle.writable);
			}
		 }
		if (watchers.length) setTimeout(poll,0);
		else timer = false;
	}
	
	return function IOWatcher(){
		// this.callback is set elsewhere
		this.start = function(){
			if (!running) return;	// don't start watcher if loop is not running
			watchers.push(this);
			if (!timer) {
				timer = true;
				setTimeout(poll,0);
			}
		};
		this.stop = function(){
			var index = -1,
				self = this;
			watchers.forEach(function(w,i){
				if (self === w) index = i;
			})
			// will get -1 if watcher was 'set' but not 'start'ed
			console.log(this.__fd, this.__isReadable ? 'readable' : (this.__isWritable ? 'writable' : 'X'),
					'== stopping watcher ', index, index>=0 && watchers[index].__fd, watchers.length);
			
			if (index >= 0) {
				watchers.splice(index,1);
			}
		};
		this.set = function(fd, isReadable, isWritable) {
			this.__fd = fd;
			this.__isReadable = isReadable;
			this.__isWritable = isWritable;  
		};
	}	// IOWatcher
})();	// process.IOWatcher closure

	
/*
 * cares
 */
function Channel(options){
	this.callback = options.SOCK_STATE_CB;	// call!??
	this.processFD = 
	this.query = emptyFunction;
	this.timeout = function(max){ return max }
	this.getHostByAddr =
	this.getHostByName = function(domain, family, callback){
		var err = null, ips = [];

		if (typeof domain == 'undefined') {
			ips = [INADDR_ANY];
		}
		else if (domain === null) {
			err = new Error('bad name');
			if (!callback) throw err;
			ips = [null];
		} 
		else if (family == 2) { // AF_INET
			if (/\d+(\.\d+){3}/.test(domain) ||  /^localhost$/i.test(domain) )
				ips = ['127.0.0.1'];
			else if (!/ipv6/i.test(domain))	// very hackish!!!!
				ips = [domain];
		} 
		else if (family == 10){  // AF_INET6
			if (!/ipv4/i.test(domain))	// very hackish!!!!
				ips = [domain];
		}
		
		if (callback)
			return defer(callback,err,ips);
		return ips;
	}
}


/*
 * Stat
 */
function Stats(){}	// prototyped in fs.js

function makeStat(path, callback){
	activeIO();		
	if (typeof path == 'number')	// = fd
		path = Handles[path].path;
	
	var stat = new Stats(),
		err = Error('file not found: '+path);

	err.path = path;
	err.errno = ENOENT;
	
	// check for file existance, throws error if not found
	var result = getFileStat(path);
	if (!callback && !result)	// throw immediate on sync
		throw err;

	stat = mixin(stat, // mock data!
		{ dev: 2049
        , ino: 305352
        , mode: (path=='.' || path[path.length-1]=='/' ? process.S_IFDIR : process.S_IFREG) // hackish!!
        , nlink: 12
        , uid: 1000
        , gid: 1000
        , rdev: 0
        , size: result.size
        , blksize: result.size
        , blocks: 1
        , atime: new Date('2009-06-29T11:11:55Z')
        , mtime: result.lastmod //new Date('2009-06-29T11:11:40Z')
        , ctime: new Date('2009-06-29T11:11:40Z')
        });
	
	if (callback)
		return defer(callback,!result && err,stat);
	else 
		return stat;
}

/*
 * Buffer
 */
function Buffer(arg, encoding) {

	var MAX_BUFFER_SIZE = 40 * 1024; 		// TODO temp!!

	this.length = 0;
	if (typeof arg == 'string') {
		var encodedStr = arg;
		if (!encoding || /^utf-?8$/i.test(encoding))
			encodedStr = unescape(encodeURIComponent(arg));
		var b = new Buffer(encodedStr.length);		
		b.length = b.write(arg,encoding,0);
		return b;
	} else if (typeof arg == 'number') {
		
		if (arg > MAX_BUFFER_SIZE) 
		{
			console.error(arg, 'exceeds ', MAX_BUFFER_SIZE, ' MAX_BUFFER_SIZE - truncating!!!;')
			
			arg = Math.min(arg,MAX_BUFFER_SIZE);	// temp!!
		}
		
		this.length = arg;
		for (var i=0; i<arg; i++) this[i] = 0;
	} else if (arg instanceof Array) {
		for (var i=0; i<arg.length; i++) this[i] = arg[i];
		this.length = arg.length;
	} else //if (arg)
		throw 'TODO unsupported Buffer argument: ' + arg;
}
Buffer.prototype = {};
Buffer.prototype.slice = function(start, stop) {
	var tmp = pSlice.call(this, start, stop);
	return new Buffer(tmp);
}

	// slice
Buffer.prototype.binarySlice = function(start, stop){
	for (var str='', i=start; i<stop; i++)
		str += String.fromCharCode(this[i] & 255);
	return str;
}
Buffer.prototype.asciiSlice = function(start, stop){
	for (var str='', i=start; i<stop; i++)
		str += String.fromCharCode(this[i] & 255); // 127!!
	return str;
}
Buffer.prototype.utf8Slice = function(start, stop){
	for (var str='', i=start; i<stop; i++)
		str += String.fromCharCode(this[i]);
	return decodeURIComponent(escape(str));
}
	// write
Buffer.prototype.asciiWrite = function(string, offset){
	offset = offset || 0;
	if (offset >= this.length) throw new Error('Offset is out of bounds');
	var towrite = Math.min(string.length, this.length - offset);
	for (var i=0; i<towrite; i++){
		this[i+offset] = string.charCodeAt(i) & 255; // & 127 !!!!! (7-bit)
	}	
	return towrite;
}
Buffer.prototype.binaryWrite = function(string, offset){
	offset = offset || 0;
	if (offset >= this.length) throw new Error('Offset is out of bounds');
	var towrite = Math.min(string.length, this.length - offset);
	for (var i=0; i<towrite; i++){
		this[i+offset] = string.charCodeAt(i) & 255;
	}
	return towrite;
}
Buffer.prototype.utf8Write = function(string, offset){
	offset = offset || 0;
	if (offset >= this.length) throw new Error('Offset is out of bounds '+ offset + ' '+ this.length);
	var encodedStr = unescape(encodeURIComponent(string));
	var towrite = Math.min(encodedStr.length, this.length - offset);
	for (var i=0; i<towrite; i++){
		this[i+offset] = encodedStr.charCodeAt(i);
	}	
	Buffer._charsWritten = string.length;
	return towrite;	// bytes written
}
// from: node_buffer.cc
// buffer.unpack(format, index);
// Starting at 'index', unpacks binary from the buffer into an array.
// 'format' is a string
//
// FORMAT RETURNS
// N uint32_t a 32bit unsigned integer in network byte order
// n uint16_t a 16bit unsigned integer in network byte order
// o uint8_t a 8bit unsigned integer
//
// NOTE: Javascript bitwise operators are 'signed' 32-bit int's. Convert to
// unsinged manually with >>>0;
Buffer.prototype.unpack = function(format,index) {
	var out = [], v, b=this, l = this.length, err = 'Out of bounds';
	format.split('').forEach(function(f){
		if (f == 'N') {
			if (index+3 >= l) throw Error(err);
			v = ( ((b[index  ] & 255) << 24) 
				| ((b[index+1] & 255) << 16) 
				| ((b[index+2] & 255) << 8)
				| ((b[index+3] & 255))  
				) >>> 0;	// >>> makes unsigned!;
			out.push(v);
			index += 4;
		} else if (f == 'n') {
			if (index+1 >= l) throw Error(err);
			v = ((b[index] & 255) << 8)	| ((b[index+1] & 255));
			out.push(v);
			index += 2;
		} else if (f == 'o') {
			if (index >= l) throw Error(err);
			v = b[index] & 255;
			out.push(v);
			index += 1;
		} else 
			throw Error('Unknown format character');
	})
	return out;
}
Buffer.prototype.copy = function(target, targetStart, sourceStart, sourceEnd){
	// source is this! range is exclusive of sourceEnd!
	if (!(target instanceof Buffer)) throw Error('First arg should be a Buffer');
	if (typeof sourceEnd == 'undefined') sourceEnd = this.length;

	if (targetStart < 0 || targetStart >= target.length) throw new Error('targetStart out of bounds');
	if (sourceStart < 0 || sourceStart >= this.length) throw new Error('sourceStart out of bounds');
	if (sourceEnd < 0 || sourceEnd > this.length) throw new Error('sourceEnd out of bounds');
	if (sourceEnd < sourceStart) throw new Error('sourceEnd < sourceStart');
	
	var toCopy = Math.min(sourceEnd - sourceStart, target.length - targetStart);
	if (toCopy <= 0) return 0;
	
	var	sourceBytes = pSlice.call(this, sourceStart, sourceStart + toCopy),
		args = [targetStart, toCopy].concat(sourceBytes);
	
	pSplice.apply(target,args);
	return toCopy;
}
Buffer.byteLength = function(string,encoding){	
	if (arguments.length < 1 || typeof string != 'string') throw Error('Bad argument');
	var b = new Buffer(string,encoding);
	return b.length; 
}
Buffer._charsWritten = 0;

/*
 * ioBuffer
 * - internal to soup - used to replicate sockets and std i/o 
 */
function ioBuffer(size){
	this.buffer = new Buffer(size || (2 * bufferSize) );	// size >= fs.ReadSteram.bufferSize
	this.readhead = this.writehead = 0;
	this.eof = true;
	this.eod = []; // list of end of data markers
}
// read: this -> buffer, length is the size of buffer available (not how much to read)
ioBuffer.prototype.read = function(buffer, offset, length){
	
//	console.log('reeeeeeeeeeeeeed', this.eod, this.eod[0] - this.readhead)

	var eod = this.writehead;
//	var eod = this.eod.shift() || 0;
	
	// 								target, targetStart, sourceStart, sourceEnd
	var bytesRead = this.buffer.copy(buffer,offset,this.readhead, eod);
	this.readhead += bytesRead;
	this.eof = this.writehead === this.readhead;
	if (this.eof) { 
		this.readhead = this.writehead = 0;
	}
	return bytesRead;
}
// write: this <- buffer
ioBuffer.prototype.write = function(buffer, offset, length){
	// 								target, targetStart, sourceStart, sourceEnd
	var bytesWritten = buffer.copy(this.buffer,this.writehead,offset,offset+length);
	this.writehead += bytesWritten;
	
	if (bytesWritten < length) 
		throw new Error('write buffer full ' + length);
	
//	this.eod.push(this.writehead);
	this.eof = this.writehead === this.readhead;
	return bytesWritten;
}
ioBuffer.prototype.isEOF = function(){
	return this.eof;
}
ioBuffer.prototype.canWrite = function(){
	return this.writehead < this.buffer.length-1;
}
ioBuffer.prototype.amount = function(){
	// amount of data remaining in buffer
	return this.writehead - this.readhead;
}

/*
 * Script (evals)
 */
function Script(code, filename){
	this.code = code;
	this.filename = filename;
}
Script.prototype.runInThisContext = function(){
	return eval(this.code);
} 
Script.prototype.runInNewContext = function(sandbox){
	if (!this._scopedCode)
		this._scopedCode = makeWritableScope(this.code);
	var result = getSandbox().eval(this._scopedCode, sandbox);
	return result;	
} 
Script.prototype.runInContext = function(sandbox){
	return this.runInNewContext(sandbox);
}
Script.prototype.createContext = function(sandbox){
	return mixin({},sandbox || {});
}
Script.runInThisContext = function(code){
	return eval(code); 
} 
Script.runInNewContext = function(code, sandbox){
	var result = getSandbox().eval(makeWritableScope(code), sandbox);
	return result;
}
Script.runInContext = function(code, sandbox){
	var result = getSandbox().eval(makeWritableScope(code), sandbox);
	return result;
}
Script.createContext = function(sandbox){
	return mixin({},sandbox || {});
}

// replace assignment with 'this.' but not var abc = ...
// abc = 123 --> this.abc = 123
// also: abc.d = 1 --> this.abc.d = 1 ||| abc[xx] -> this.abc[xx] 
// negative lookbehind inspiration from:  http://blog.stevenlevithan.com/archives/mimic-lookbehind-javascript
function makeWritableScope(code){
	var vars = /(\s*var\s+)?(([_\w\$])(\s*\.\s*\2|\s*\[[^\]]\]\s*)*)+(?=\s*(?:\+|-|\*|\/|%|<<|>>|>>>|&|\||\^)?=[^=])/g;
	code = code.replace(vars, function($0, $1){
		return $1 ? $0 : 'self.' + $0;
	});
	return code;
}

//process.getSandbox = getSandbox;

function getSandbox() {
	if (nodeSoup.sandbox) return nodeSoup.sandbox;
	nodeSoup.sandbox = {eval: function(s,c){ 
			try{ return (function(){ var self=this; with (self){ return eval(s) }}).call( c||{} ) }
			catch(e){
				if (e && e.constructor && e.constructor.name === "SyntaxError")
					throw e;
				else
					throw ''+e;  
			}  
		}};
}

nodeSoup.sandbox = null;
getSandbox();



/*
 * locals
 */

var 
	pSplice = Array.prototype.splice,
	pSlice = Array.prototype.slice,
	bufferSize = 4096,  				// == fs.ReadSteram.bufferSize
	STDIN = new std_fd(0,bufferSize),	// define after Buffer defn
	STDOUT = new std_fd(1,bufferSize);


function getFileContent(path, position, length){
	
	var result = '', range = '',
		xhr = new XMLHttpRequest();
	
	xhr.addEventListener('load',function(ev){
		
		if (00000000) console.log(444444444, ev, this.status, range, this.responseText.length,
				parseInt(this.getResponseHeader("Content-Length") || 0,10)	
				);
		if (this.status < 400)
			result = this.responseText;
		else if (this.status == 416)	// "Requested Range Not Satisfiable", probably eof
			result = -1;
		else
			result = new Error(this.statusText); 
	}, false);

	xhr.addEventListener('error',function(ev){
		console.info('error ', path, arguments);
		result = new Error(this.statusText); 
	}, false);

	
	try{
		xhr.open('GET',path, /* async */null);
		if (typeof position != 'undefined') range = 'bytes='+position;
		if (typeof length != 'undefined') range += '-'+(position+length-1);
		if (range)
			xhr.setRequestHeader('Range',range)
		xhr.send();
	} catch(e){
		// likely a file not found
		result = new Error('error reading '+path+' : '+ e );
	}
	return result;
}

function getFileStat(path){
	var size = 0, 
		ok = true,
		lastmod = new Date().toGMTString(),
		xhr = new XMLHttpRequest();
	
	xhr.addEventListener('load',function(ev){
		// console.log(this.getAllResponseHeaders());
		size = parseInt(this.getResponseHeader("Content-Length") || 0,10);	
		lastmod = new Date(this.getResponseHeader("Last-Modified") || new Date() );
	}, false);
	xhr.addEventListener('error',function(ev){
		console.info('error ', path, arguments);
		ok = false;
	}, false);
	
	try{
		xhr.open('HEAD',path, /* async */null);
		xhr.send();
		if (xhr.status == 404) 
			ok = false;
	} catch(e){
		// likely a file not found
		// throw e;
		ok = false;
	}
	return ok && {size: size, lastmod: lastmod};
}

// defer a callback
function defer(cb /* ,args */){
	var args = pSlice.call(arguments,1);
	// add to queue for next tick
	process.nextTick(function(){ cb.apply(cb,args) });
}

var original_setTimeout = window.setTimeout;
function deferNow(cb /* ,args */){
	var args = pSlice.call(arguments,1);
	original_setTimeout(function(){ cb.apply(cb,args) }, 0);
} 


// TODO remove!!!!!!!!!!!!!!!!!!!11
//process.exitAfter is a utility function - NOT part of node.js
process.exitAfter = function(delay){
	original_setTimeout("process.reallyExit(-1)", delay);
}



// bind a function f to a context (this)
function bindTo(context,f) {
    return function() {
      var args = pSlice.call(arguments);
      return f.apply(context, args);
    }
}

function mixin(dest /*,source,...*/){
	var i,l,source,key;
	for (i=1, l=arguments.length; i<l; i++) {
		source = arguments[i];
		for (key in source) {
			dest[key] = source[key];
		}
	}
	return dest;
}

function trim(str){
	if (String.prototype.trim) return str.trim();
    // http://yesudeep.wordpress.com/2009/07/31/even-faster-string-prototype-trim-implementation-in-javascript/
	var str = str.replace(/^\s\s*/, ''),
        ws = /\s/,
        i = str.length;
    while (ws.test(str.charAt(--i)));
    return str.slice(0, i + 1);
}

// splitOnFirst("a:b:c",":") -> ["a","b:c"]
function splitOnFirst(str,token){
    var index = str.indexOf(token);
    if (index == -1) return [str];
    return [str.substring(0, index),str.substring(index + token.length)];
}

// borrow from sys.js
function inherits (ctor, superCtor) {
	  var tempCtor = function(){};
	  tempCtor.prototype = superCtor.prototype;
	  ctor.super_ = superCtor;
	  ctor.prototype = new tempCtor();
	  ctor.prototype.constructor = ctor;
}
/*
exports.inherits = function (ctor, superCtor) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
            value: ctor,
            enumerable: false
        }
    });
};
*/


// closure on timer functions, since node.js overrides them
var TICK_INTERVAL = 120,
	setTimeout = timeWrap('setTimeout'),
	setInterval = timeWrap('setInterval'),
	clearTimeout = window.clearTimeout,
	clearInterval = window.clearInterval,
	console = (function(){ return (constructor in window.console && new window.console.constructor) || window.console; })() ;


console.log(111,222);

function timeWrap(method) {
	// closure on original method
	var original = window[method];
	return function(){ 
		arguments[1] += TICK_INTERVAL;	// extend time 
		return original.apply(window, arguments);
	}
}

//don't allow node.js to override time functions on 'global', otherwise will get infinite recursion
if (000000000)
['setTimeout','setInterval','clearTimeout','clearInterval','console'].forEach(function(m){
	Object.defineProperty(global, m, { 
		get: function(){ throw 222222; return eval(m) }, 
		set: function(){ throw 3333333; }
	});
});


//init nodeSoup here 
function nodeSoup(){}

var moduleCache = {};
nodeSoup.loadModule = function(name){
	if (name in moduleCache) return moduleCache[name];
//	var Module = process.mainModule.constructor;
	var m = new Module(name);
	m.loadSync( NODE_ROOT + '/lib/' + name + '.js');
	moduleCache[name] = m.exports;
	return m.exports;
};

var Module;
nodeSoup.Module = null;

// hijack Module._compile to handle filename content! (sort of an implied include)
// note: this will be active one process.mainModule is loaded (doesn't happend for REPL!)
nodeSoup._hijackModule = function(){

	if (!process.mainModule) throw Error('process.mainModule not defined!');
	Module = nodeSoup.Module = process.mainModule.constructor;
	
//	console.log('0----------- hijacked');
	
	Module.prototype._compile_orig = Module.prototype._compile;
	Module.prototype._compile = function(content, filename){
		//console.log('   in hijacked _compile ........', content.substr(0,100), filename);
		var path, fs;
		// check to see if 1st line of content is a file.js (if so, load that file) 
		while (1) {
			var n = content.indexOf('\n'),
				line1 = trim(content.substring(0,n < 0 ? content.length : n ));
			
			if (/.+\.js$/.test(line1)) {
				path = path || nodeSoup.loadModule('path');
				fs = fs || nodeSoup.loadModule('fs');
				
				fn = path.join(path.dirname(filename), line1);
				content = fs.readFileSync(fn, 'utf8');
			} else {
				break;
			}
		}
		this._compile_orig.call(this,content,filename);	// using original filename, ok?
	}
}



//export
window._getFileContent = getFileContent;
window.nodeSoup = nodeSoup;

window.boo = function(){
	console.log(111,222);
}

})();	/* local scope */


//execute in closure-free scope, since eval() assumes the local scope
process.compile = function(/*source, file*/){
	// hijack Module when available
	if (!nodeSoup.Module && process.mainModule) nodeSoup._hijackModule();
	// handle ::native:: content
	if (arguments[0].indexOf("::"+arguments[1]+"::") != -1){
		// read file and insert into source at token 'file'
		// return eval(arguments[0].replace("::"+arguments[1]+"::", _getFileContent(process.env.NODE_PATH + arguments[1] + '.js') ));
		
		// TEMP::: this format aids in debugging in Firebug!!!
		var _content = arguments[0].replace("::"+arguments[1]+"::", window._getFileContent(NODE_ROOT +'/lib/'+ arguments[1] + '.js') );
		return eval(_content);
	}
	return eval(arguments[0]);
};



//load and execute node.js main function
(eval( window._getFileContent(NODE_ROOT + '/src/node.js') )) (process);



/*
 * nodeSoup
 */
(function(){

	// piggyback off mainModule.constructor since don't have ready access to module.js
	var Module = process.mainModule.constructor;

	var soupCache = {};

	// new module definition -- modules don't run until they are explicity 'loadSync'd or 'require'd
nodeSoup.defineModule = function(fn,id) {
	// see: http://wiki.commonjs.org/wiki/Modules/Transport/D ..... for slightly different signature!!
	// see:  http://github.com/jbrantly/yabble!!!
	
	id = id || (typeof fn=='string' && fn) || (+new Date);
	if (typeof fn == 'function') {
		id += !/\.js$/i.test(id) ? '.js' : '';	// should end with .js since 'require' appends it
		id = '#'+id;	// special handling for inline function modules
						// this is needed to bypass file stat when an inline module is 'require'd
	}

	if (id in soupCache) require('sys').debug('module '+id+' already defined! -- redefining!!');
		
	var module = new Module(id, /*parent*/null);
	module.__handler = fn;
	
	soupCache[id] = module;
	return module;
}

Module.prototype._loadSync = Module.prototype.loadSync; 

Module.prototype.loadSync = function(filename) {

	// when coming here from a 'require' directive, 'this' refers to temp obj created in module.js 
	// and not one created by nodeSoup.newModule
	
	console.warn('my load sync', filename);
	
	if (!(filename in soupCache)) {
		this._loadSync(filename);
		return;
	}
		
	var fn = soupCache[filename].__handler;
	if (typeof fn == 'string') {
		// it's a file
		this._loadSync(fn);
	
	} else if (typeof fn == 'function') {
		// it's an inline (function)
		
		this.filename = './';	// dummy filename
		if (!this.__handler) this.__handler = fn;
		
		// the content of the module is to run 'fn' with normal module parameters
		// parameters are same as module.js: Module.prototype._compile wrapper function
		var content = "module.__handler.apply(exports, [exports, require, module, __filename, __dirname])";

		this._compile(content, this.id );
		this.loaded = true;
	} else
		throw 'first arg to module should be filename or function';
};

nodeSoup.run = function(fn){
	var main = nodeSoup.defineModule(fn,'main');
	main.loadSync(main.id);
};


})();	// nodeSoup scope

console.log('node-soup loaded');
boo();
