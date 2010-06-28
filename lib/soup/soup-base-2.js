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
	global = window,	// ///
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
if (!Object.getOwnPropertyNames) {
	Object.getOwnPropertyNames = function(obj) {
		// limitations: can't access non-enumerable properties
		return Object.keys(obj);
	}
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
process.version = '0.1';
process.platform = 'node-soup';
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
	// we'll override the process.emit() routine to fire certain events when all watchers are done.	
}

var waitEvents = [],
	exitCode = 0,
	exitEventIndex = -1;

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

		// if it's first time, kickstart IOWatcher otherwise it may never fire back
		if (waitEvents.length == 1){
			setTimeout(function(){ new process.IOWatcher().stop() },750); // a little time for things to settle
		}
			
		return;
	} 
	// else
	return process.EventEmitter.prototype.emit.apply(process,args);
}

// eventLoopIsEmpty is called by IOWatcher class (below) when all watchers have been processed
function eventLoopIsEmpty(){
	// fire wait events
	var event;
	while (event = waitEvents.shift()) {
		console.info('firing delayed ', event, waitEvents);
		if (event[0] == 'exit' && event.length == 1)	// add exit code
			event[1] = exitCode;
		
		process.EventEmitter.prototype.emit.apply(process,event);
	}
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

process._needTickCallback = function(){
	// just call queued callbacks - no ticks involved
	defer(process._tickCallback);
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
	this.eof = false;
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
	this.error = 0; // success
	Sockets[this.fd] = this;
}


process.binding = function(module){
	// console.log('binding:',arguments);

	switch (module) {
	case 'natives':
		if (natives) return natives;
		natives = {};
		'assert buffer child_process dns events file freelist fs http crypto ini mjsunit net posix querystring repl sys tcp uri url utils path module utf8decoder'
			.split(' ').map(function(n){natives[n] = nativeMarker + n + nativeMarker});
		return natives;
		
	case 'fs':
		return {
			// TODO::::: missing many fs bindings!!!!!!!!!
			Stats : Stats,
			stat  : makeStat,
			lstat : makeStat,
			fstat : makeStat,
			open : function(path, flags, mode, callback){
				var handle = new fd_handle(path, flags, mode);
				if (callback)
					return defer(callback,/* err */null,handle.fd);

				return handle.fd; 
			},
			close : function(fd, callback){
				if (fd in Handles) { 
					delete Handles[fd];
				}
				if (callback)
					defer(callback,/* err */null);
			},
			// read all at once
			read : function(fd, buffer, offset, length, position, callback){
				var bytesRead = 0, result=true,
					handle = Handles[fd];
				if (handle.buffer){
					position = position || 0;
					bytesRead = handle.buffer.copy(buffer,offset,position,position+length-1);
					
					// TODO : remove from fd!????? as in STDIN
					
				} else {
					if (position === 0 || !handle.eof) {
						result = getFileContent(handle.path);	// read as utf-8
						if (result) bytesRead = buffer.utf8Write(result,offset);
						handle.eof = true; 
					}
				}
				if (callback) {
					var err = !result;
					return defer(callback,err,bytesRead);
				}
				return bytesRead;
			},
			// TODO!!!!!!!!!!!!!
			// TODO!!!!!!!!!!!!!
			write : function (fd, buffer, offset, length, position, callback){
				// console.log(':: write', arguments, typeof fd, typeof
				// fd.write);
				
				var	handle = Handles[fd],
					bytesWritten = 0;
				
				position = position || 0;
				// stdin/out haver buffer
				if (handle.buffer) {

					// (target, targetStart, sourceStart, sourceEnd) <- inclusive endpoints
					bytesWritten = buffer.copy(handle.buffer,position,offset,offset+length-1);
					
					if (fd == 1 ){ // stdout
						var str = buffer.toString(/* encoding */'', offset, offset+length);
						console.log('STDOUT::',str);
					}
					
				} else {
					// TODO!!! write to FILE!!!
					console.log('TODO: write to FILE!!!!');
					bytesWritten = length;
				}

				if (callback) {
					return defer(callback,null,bytesWritten);
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
				console.log(msg);
				// TODO
				// STDERR += msg + "\r\n";
			},
			openStdin: function(){ return STDIN.fd },
			isStdoutBlocking: function(){ return true },
			isStdinBlocking: function(){ return true }
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
				handle = Sockets[fd];
				handle.peer = null;
				
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
					if (!found) {	// No one listening on the remote address.
									// http://linux.die.net/man/2/connect
						handle.error = ECONNREFUSED; 
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
						
						// TODO is this needed!!!!!
//						peer.writable = true;	// peer can write to remote!
						
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
				
				console.log('close socket fd',fd, 'peer', Sockets[fd].peer, Sockets[fd].pair);
				
//				debugger;
				
				if (fd in Sockets) {
					handle = Sockets[fd];
					if (!handle.pair || !(handle.pair in Sockets)) {
						delete handle.reader;
						delete handle.writer;	// safe on connected sockets ???
					}
					delete Sockets[fd];
					// TODO reuse fd.. add to reuse list
				}
				return 0; // success
			},
			shutdown : function(fd,how){
				if (fd in Sockets){
					handle = Sockets[fd];
					how = how || 'write';  // default: see node_net2.cc 
					if (how == 'write' || how == 'readwrite') handle.writable = false; 
					if (how == 'read'  || how == 'readwrite') handle.readable = false;
				}
				return 0; // success
			},
			socketError : function(fd){
				return Sockets[fd].error;
			},
			// read from fd into buffer: offset & length refer to buffer
			read : read = function(fd, buffer, offset, length){
				if (!(fd in Sockets)) throw 'fd not in socket for read: ' + fd;
				handle = Sockets[fd];
				var reader = handle.reader;
				if ( !length || reader.eof ) return 0; 
				
				var bytesRead = reader.read(buffer, offset, length);
				
				//console.info('read %d bytes from %d (pair %d)\n',bytesRead,fd,handle.pair, buffer.toString());
				
				// mark its pair writable
				if (handle.pair && (handle.pair in Sockets)) { 
					var pair = Sockets[handle.pair];
					pair.writable = reader.canWrite();
				} 
				//else throw 'fd has no paired writer: ' + fd;

				return bytesRead;
			},
			// write to fd from buffer: offset & length refer to buffer
			// TODO implements write (not append!), previous data gets obliterated -- is this correct??
			write : write = function(fd, buffer, offset, length){
				if (!(fd in Sockets)) throw 'fd not in socket for write: ' + fd;
				if (!length) return 0;
				handle = Sockets[fd];
				var writer = handle.writer;

				var bytesWritten = writer.write(buffer, offset, length); 
				
				//console.info('write %d bytes to %d (pair %d)\n',bytesWritten,fd,handle.pair, writer.buffer.toString());

				// mark its pair readable
				if (!handle.pair || !(handle.pair in Sockets)) throw 'fd has no paired reader: ' + fd;
				var pair = Sockets[handle.pair];
				pair.readable = ! writer.eof;

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
			
			// TODO................

			toRead      : function(){debugger}, 
			setNoDelay  : function(){debugger},
			setKeepAlive: function(){debugger},
			getpeername : function(){debugger},
			socketpair	: function(){debugger},
			pipe		: function(){debugger},
			sendFD		: function(){debugger},
			
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

var EINPROGRESS = 36,
	ENOENT = 2,
	EMFILE = 24,
	ECONNREFUSED = 61;

var INADDR_ANY = '0.0.0.0';

/*
 * HTTPParser
 */

var CRLF = "\r\n";

function HTTPParser(type){
	this.reinitialize(type);
}
HTTPParser.prototype = {}
HTTPParser.prototype.execute = function(buffer, offset, length){

	var	parser = this;
	invoke('onMessageBegin');
	if (length <= 0) { 
		invoke('onMessageComplete');
		return 0;
	}
	
	var	chunked = false,
		data = buffer.toString('utf-8',offset,offset+length),	// enc??
		parts = data.split(CRLF+CRLF),
		header = parts[0],
		body = parts[1],
		lines = header.split(CRLF),
		line1 = lines.shift(),
		info = {}, 
		headers = []
		;
		
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
		//	this.incoming._addHeaderLine(h[0], h[1]);
		invoke('onHeaderField', h[0]);
		invoke('onHeaderValue', h[1]);
	}
	invoke('onHeadersComplete',info);
	var bytesParsed = header.length + 2 * CRLF.length;

	// exit the rest if upgrade
	if  (info.upgrade){
		invoke('onMessageComplete');
		bytesParsed -= 1; /* http.js line 617 */		// TODO !!!!!!???
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
			if (chunkSize == 0) break;

			bytesParsed += sizeLine.length + CRLF.length;
			invoke('onBody', buffer, offset + bytesParsed, chunkSize);
			// eat chunk
			parts.shift(); // discard string rep
			bytesParsed += chunkSize + CRLF.length;
		}
		// TODO? more headers?
		if (parts.length)
			throw 'TODO support chunked encoding footers';
			// & send headers here...

	} else {
		invoke('onBody',buffer, offset + bytesParsed, length - bytesParsed);
		bytesParsed = length;
	}

	// done!
	invoke('onMessageComplete');
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
		var parts, field = value = '';
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
			if (/Upgrade/i.test(field)) 
				info.upgrade = true;
			if (/Connection/i.test(field) && /keep-alive/i.test(value)) 
				info.shouldKeepAlive = true;
			if (/Transfer-Encoding/i.test(field) && /chunked/i.test(value))
				chunked = true;
		}
		if (value) headers.push([field,value]);
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
	// this.timeout = 0;

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
	this.start = function(after, repeat_){
		if (arguments.length != 2) throw new Error('Bad arguments');
		repeat = repeat_;
		if (after > 0) {
			timer = setTimeout(cb, after);
		} 
		// important else: if after was triggered, it will trigger any repeat
		else if (repeat > 0) {
			timer = setTimeout(cb, repeat);
		}
	}
	
	this.stop = function(){
		if (!timer) return;
		clearTimeout(timer); 
		timer = null;
	}
	
	this.again = function(repeat_){
		this.stop();
		if (typeof repeat_ != 'undefined')
			repeat = repeat_;
		if (repeat > 0)
			this.start(0,repeat);
	}
	
	Object.defineProperty(this, "repeat", { 
		get: function() { return repeat },
		set: function(val) { repeat = val }
	});
}

/*
 * IOWatcher
 */

var watchers = [];
process.IOWatcher = (function(){
	var timer = null,
		next = 0;
		POLL_INTERVAL = 150;	// msec
	
	timer = new process.Timer();
	timer.callback = poll;
	
	function poll(){		
		if (!watchers.length) return;
		if (next >= watchers.length) next = 0;
		var w = watchers[next];
		++next;
		
		// watchers.forEach(function(w){
			var fd = w.__fd, haveData = false, handle=null;
			if (fd in Handles) {
				// TODO ??
			} else if (fd in Sockets) {
				handle = Sockets[fd];
				haveData = (w.__isReadable && handle.readable )
						|| (w.__isWritable && handle.writable )
			} else {
				// socket must have closed -- shutdown watchers!! 
				// TODO  is this safe????
				
				console.log(' >> %d is closed - auto shutdown watcher', fd);
				w.stop();
				//return;
			}
			
			console.log(next-1,'--- watching w, fd, havedata: ',  fd
					, w.__isReadable ? 'readable' : (w.__isWritable ? 'writable' : 'X')
					, haveData
					, 'R', handle.reader && handle.reader.amount()
					, 'W', handle.writer && handle.writer.amount()
					);
			
			
			// TODO blocking or non-blocking call!!!???
			// TODO blocking or non-blocking call!!!???
			// TODO blocking or non-blocking call!!!???
			if (haveData && w.callback && handle) {
// 				defer(bindTo(w,w.callback), handle.readable, handle.writable);
				w.callback.call(w, handle.readable, handle.writable);
			}
		// })
	}
	
	return function IOWatcher(){
		// this.callback is set elsewhere
		this.start = function(){
			watchers.push(this);
			//if (!timer) timer = setInterval(poll, POLL_INTERVAL)
			timer.again(POLL_INTERVAL);
		}
		this.stop = function(){
			var index = -1,
				self = this;
			watchers.forEach(function(w,i){
				if (self === w) index = i;
			})
			
			console.log('== stopping watcher ', index, index>=0 && watchers[index].__fd, watchers.length);
			
			if (index >= 0) {
				watchers.splice(index,1);
				if (next > index)	// 0 1 -2- *3 4 5 6
					--next;
			}
			if (!watchers.length) {
				//clearInterval(timer);
				//timer = null;
				timer.stop();
				
				// all watchers stopped. inform process!
				eventLoopIsEmpty();
			}
		}
		this.set = function(fd, isReadable, isWritable) {
			this.__fd = fd;
			this.__isReadable = isReadable;
			this.__isWritable = isWritable;  
		}
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

	var MAX_BUFFER_SIZE = 20 * 4096; 		// TODO temp!!

	this.length = 0;
	if (typeof arg == 'string') {
		var encodedStr = arg;
		if (!encoding || /^utf-?8$/i.test(encoding))
			encodedStr = unescape(encodeURIComponent(arg));
		var b = new Buffer(encodedStr.length);		
		b.length = b.write(arg,encoding,0);
		return b;
	} else if (typeof arg == 'number') {
		
		if (arg > MAX_BUFFER_SIZE 
				&& arg != 30000 /* for test-fs-read-file-sync.js!!! */ ) 
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
	Buffer._charsWritten = string.length;	// TODO use utf8Decoder!!! multibyte might be split!!!!
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
	// source is this! range is inclusive on both ends!
	if (!(target instanceof Buffer)) throw Error('First arg should be a Buffer');
	targetStart = targetStart || 0;
	sourceStart = sourceStart || 0;
	sourceEnd = 1 + (sourceEnd || this.length-1);

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
	this.buffer = new Buffer(size || 1024);
	this.readhead = this.writehead = 0;
	this.eof = true
}
// read: this -> buffer, length is the size of buffer available (not how much to read)
ioBuffer.prototype.read = function(buffer, offset, length){
	// 								target, targetStart, sourceStart, sourceEnd
	var bytesRead = this.buffer.copy(buffer,offset,this.readhead,this.writehead-1);
	this.readhead += bytesRead;
	this.eof = this.writehead === this.readhead;
	if (this.eof) { 
		this.readhead = this.writehead = 0; // (worker) thread safe!!?
	}
	return bytesRead;
}
// write: this <- buffer
ioBuffer.prototype.write = function(buffer, offset, length){
	// 								target, targetStart, sourceStart, sourceEnd
	var bytesWritten = buffer.copy(this.buffer,this.writehead,offset,offset+length-1);
	this.writehead += bytesWritten;
	
	if (bytesWritten < length) 
		console.error('write buffer full', this.readhead, this.writehead, bytesWritten, length);
	this.eof = this.writehead === this.readhead;
	return bytesWritten;
}
ioBuffer.prototype.canWrite = function(){
	return this.writehead < this.buffer.length;
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
Script.runInThisContext = function(code,filename){
	return eval(code); 
} 
Script.runInNewContext = function(code, sandbox, filename){
	var result = getSandbox().eval(makeWritableScope(code), sandbox);
	return result;
}

// replace assignment with 'this.' but not var abc = ...
// abc = 123 --> this.abc = 123
// also: abc.d = 1 --> this.abc.d = 1 ||| abc[xx] -> this.abc[xx] 
// negative lookbehind inspiration from:  http://blog.stevenlevithan.com/archives/mimic-lookbehind-javascript
function makeWritableScope(code){
	var vars = /(\s*var\s+)?(([_\w\$])(\s*\.\s*\2|\s*\[[^\]]\]\s*)*)+(?=\s*(?:\+|-|\*|\/|%|<<|>>|>>>|&|\||\^)?=[^=])/g;
	code = code.replace(vars, function($0, $1){
		return $1 ? $0 : 'this.' + $0;
	});
	return code;
}

process.getSandbox = getSandbox;

function getSandbox() {
	
	if (nodeSoup.sandbox) return nodeSoup.sandbox;
	
	nodeSoup.sandbox = {eval: function(s,c){ return (function(){ with (this){ return eval(s) }}).call( c||{} ) }};

return;

	
	if (typeof document == 'undefined' || !document || !/loading|complete|interactive/i.test(document.readyState ) || !document.body){
		return {eval: function(){ (debug || alert)('document not loaded, cannot initiate sandbox!!') }};
	}

	// from: http://dean.edwards.name/weblog/2006/11/sandbox/
		//create an <iframe>
	var iframe = document.createElement("iframe");
	iframe.style.display = "none";
	iframe = document.body.appendChild(iframe);
		// write a script into the <iframe> and create the sandbox
	var doc = (iframe.contentWindow || iframe.contentDocument).document;
	doc.write(
	  "<script>"+
	  "var MSIE/*@cc_on =1@*/;"+ // sniff
	  "parent.nodeSoup.sandbox=MSIE?this:{eval:function(s,c){ return (function(){ with (this){ return eval(s) }}).call(c||{}) }}"+
	  "<\/script>"
	);
	doc.close();
	return {eval: function(){ (debug || alert)('sandbox not available yet!!') }};
}

//console.log('document is: ', document.readyState );

nodeSoup.sandbox = null;
getSandbox();



/*
 * locals
 */

var 
	pSplice = Array.prototype.splice,
	pSlice = Array.prototype.slice,
	STDIN = new std_fd(0,1024),	// define after Buffer defn
	STDOUT = new std_fd(1,4096);


function getFileContent(path){
	
	var content = '', ok=true;
	var xhr = new XMLHttpRequest();
	
	xhr.addEventListener('load',function(ev){
		content = this.responseText;
	}, false);
	xhr.addEventListener('error',function(ev){
		console.info('error ', path, arguments);
		ok = false;
	}, false);
	
	try{
		xhr.open('GET',path, /* async */null);
		xhr.send();
	} catch(e){
		// likely a file not found
		ok = false;
	}
	return ok && content;
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
	setTimeout(function(){cb.apply(cb,args);},       20);
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

//don't allow node.js to override time functions on 'global', otherwise will get infinite recursion

var setTimeout = window.setTimeout,
	setInterval = window.setInterval,
	clearTimeout = window.clearTimeout,
	clearInterval = window.clearInterval,
	console = window.console;

['setTimeout','setInterval','clearTimeout','clearInterval','console'].forEach(function(m){
	Object.defineProperty(global, m, { 
		get: function(){ return eval(m) }, 
		set: function(){ }
	});
});


//export
window._getFileContent = getFileContent;

})();	/* local scope */


// execute in closure-free scope, since eval() assumes the local scope
process.compile = function(/*source, file*/){
	if (arguments[0].indexOf("::"+arguments[1]+"::") != -1){
		// read file and insert into source at token 'file'
		// return eval(arguments[0].replace("::"+arguments[1]+"::", _getFileContent(process.env.NODE_PATH + arguments[1] + '.js') ));
		
		// TEMP::: this format aids in debugging in Firebug!!!
		
		var _content = arguments[0].replace("::"+arguments[1]+"::", window._getFileContent(NODE_ROOT +'/lib/'+ arguments[1] + '.js') );
		return eval(_content);
	}
	return eval(arguments[0]);
};




//init nodeSoup here 
function nodeSoup(){}

(function(){
	var moduleCache = {};
	nodeSoup.loadModule = function(name){
		if (name in moduleCache) return moduleCache[name];
		var Module = process.mainModule.constructor;
		var m = new Module(name);
		m.loadSync( NODE_ROOT + '/lib/' + name + '.js');
		moduleCache[name] = m.exports;
		return m.exports;
	};
})();


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
}

nodeSoup.run = function(fn){
	var main = nodeSoup.defineModule(fn,'main');
	main.loadSync(main.id);
}


})();	// nodeSoup scope

console.log('node-soup loaded');
