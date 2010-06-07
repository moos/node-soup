/* node-soup
 * 	
 * 		client-side reclaims node.js
 * 
 * (c) 2010 Moos 
 * http://github.com/moos/node-soup
 *
 * version: super alpha
 * 
 */

var 
	process= {}, 
	global = window,	// ///
	GLOBAL = {}
	;


// defined in /node/deps/v8/src/v8natives.js
if (!Object.keys) {
	Object.keys = function (object) {
	  var results = [];
	  for (var property in object)
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


/* scope control */
(function(){
	
	// local vars
	var uid = 2001,
		gid = 3001,
		cwd = '.',
		umask = 0666;
	
	var emptyFunction = function(){};

	
function EventEmitter(){}
process = new EventEmitter();		// process is-a EventEmitter
									// (node_events.cc)
	// process.EventEmitter.prototype is extended in events.js
	// with process.addListener & process.removeListener, etc

process.EventEmitter = EventEmitter;	// container to subclass later

process.global = global;
process.version = '0.1';
process.installPrefix = '';
process.platform = 'node-soup';
process.ARGV = process.argv = ['node','app.js']; // argv[1] is main()!
process.ENV = process.env = {
		'HOME' : '/.',
		'NODE_PATH' : '/lib',
		'NODE_DEBUG' : 0,
		}; 
process.pid = 200; 

process.loop = function(){
	// block until all events are handled!
	// since we can't block a call in a browser (except by blocking execution through cpu hording)
	// we'll override the process.emit() routine to fire certain events when all watchers are done.	
}

var waitEvents = [];

process.emit = function(type /* ,args */){	// node.cc <-- node_events.cc
	var args = pSlice.call(arguments);
	// events to wait until loop() is finished
	if (type == 'exit') {
		waitEvents.push(args);
		return;
	} 
	// else
	process.EventEmitter.prototype.emit.apply(process,args);
}

// eventLoopIsEmpty is called by IOWatcher class (below) when all watchers have been processed
function eventLoopIsEmpty(){
	// fire wait events
	var event;
	while (event = waitEvents.shift()) {
		console.info('firing ', event);
		
		process.EventEmitter.prototype.emit.apply(process,event);
	}
}

process.unloop = function(){ throw Error("deprecated!") }
process._byteLength = function(string,encoding){
	if (arguments.length < 1 || typeof string != 'string') throw Error('Bad argument');
	var b = new Buffer(string,encoding);
	return b.length; 
}
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

process._needTickCallback = function(){
	// just call queued callbacks - no ticks involved
	defer(process._tickCallback);
}

// empties / noop
process.checkBreak = 
process.kill =
process.reallyExit =
	emptyFunction;



process.compile = function(source, file){
	// console.log('compile:',arguments);
	
	var	bindingToken = nativeMarker + file + nativeMarker;
	if (source.indexOf(bindingToken) != -1){
		// read file and insert into source at token 'file'
		
		var [ok, content] = getFileContent('lib/'+file+'.js');	// TODO path is hardcoded!!!
		
		source = source.replace(bindingToken, content);
	}

	// console.log(source);
	return eval(source);
};


var natives = null,
	nativeMarker = '::',
	Handles = {},
	NEXT_FD = 3;	// 0 stdin, 1 stdout, 2 stderr
	
function Stats(){}	// prototyped in fs.js
function Channel(options){
	this.callback = options.SOCK_STATE_CB;	// call!??
	this.processFD = 
	this.query = emptyFunction;
	this.timeout = function(max){ return max }
	this.getHostByAddr =
	this.getHostByName = function(domain, family, callback){
		var err = null, ips;

		// TODO
		if (000000000 && !domain) {
			err = new Error('bad name');
			if (!callback) throw err;
		} else {
			// TODO handle family!!
			ips = ['127.0.0.1'];	
		}
		if (callback)
			return defer(callback,err,ips);
		return ips;
	}
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
	//this.eof = false;
	this.buffer = new Buffer();	// len???
	this.error = 0; // success
	this.readable = this.writable = false;
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
				var bytesRead = 0, ok=true, content;
				if (fd instanceof Buffer){
					position = position || 0;
					bytesRead = fd.copy(buffer,offset,position,position+length);
					
					// TODO : remove from fd!????? as in STDIN
					
				} else {
					var handle = Handles[fd];
					if (position === 0 || !handle.eof) {
						[ok,content] = getFileContent(handle.path);	// read as utf-8
						if (ok) bytesRead = buffer.utf8Write(content,offset);
						handle.eof = true; 
					}
				}
				if (callback) {
					return defer(callback,!ok,bytesRead);
				}
				return bytesRead;
			},
			// TODO!!!!!!!!!!!!!
			// TODO!!!!!!!!!!!!!
			write : function (fd, buffer, offset, length, position, callback){
				// console.log(':: write', arguments, typeof fd, typeof
				// fd.write);
				
				var handle, bytesWritten = 0,
					str = buffer.toString(/* encoding */'', offset, offset+length);
				
				position = position || 0;
				// stdin/out use buffer as fd
				if (fd instanceof Buffer) {
					bytesWritten = fd.asciiWrite(str,position);   // TODO  ?????????????  encoding
					
					console.log(str);	// stdout!!
					
				} else if (typeof fd == 'string'){
					debugger; // !!!!!!
					fd += str;
					bytesWritten = str.length;
				} else if (fd in Handles) {
					handle = Handles[fd];
					// TODO!!! write to FILE!!!
					// bytesWritten = 0;
				} else if (fd in Sockets) {
					
					// shouldn't get here!!!
					debugger;
					
					handle = Sockets[fd];
					if (handle.buffer instanceof Buffer)
						// TODO allocate space in handle.buffer!!!!!
												// (target, targetStart, sourceStart, sourceEnd)
						bytesWritten = buffer.copy(handle.buffer,position,offset, offset+length);
					else throw 'no Buffer defined on socket: ' +fd;
				}
				
				if (callback) {
					return defer(callback,null,fd);
				}
				return bytesWritten;
			}
		}; 
		
	case 'buffer':
		return {Buffer: Buffer};
		
	case 'stdio':
		// TODO stdout/in should be EventEmitter --- streams!!!????
		return {
			stdoutFD: new Buffer(4096),
			writeError: function(msg){
				console.log(msg);
				// TODO
				// STDERR += msg + "\r\n";
			},
			openStdin: function(){ return new Buffer(1024) },
			isStdoutBlocking: function(){ return true },
			isStdinBlocking: function(){ return true }
		}
		
	case 'cares':
		return {
			Channel: Channel,
			isIP : function(arg){
				return /\d+\.\d+\.\d+.\d+/.test(arg) ? 4 : 0;	// TODO ip6
			},
			AF_INET : 0,// ?
			AF_INET6 : 0,// ?
			SOCKET_BAD : -1, // ?
			
			A:1, AAAA:26, MX:15, TXT:16, SRV:33, PTR:12, NS:2,
			// ERROR CODES
			NODATA : 1,		FORMERR : 2,	BADRESP : 10,	NOTFOUND : 4,
			BADNAME : 8,	TIMEOUT : 12,	CONNREFUSED:11,	NOMEM : 15,	
			DESTRUCTION:16,	NOTIMP : 5,		EREFUSED : 6, 	SERVFAIL : 3
		}
		
	case 'http_parser':
		return {HTTPParser: HTTPParser}
		
	case 'net':
		var EINPROGRESS = 36,
			ENOENT = 2,
			EMFILE = 24,
			ECONNREFUSED = 61;

		return {
			socket : function(arg,address){
				var handle;
				if (arg == 'unix')
					handle = new socket_handle();
				else // tcp4, tcp6
										// TODO websocket!!!!!
					handle = new socket_handle();
				
				return handle.fd; 
			},
			bind : function(fd,arg,address) {
				var handle = Sockets[fd];
				if (arg >= 0) {
					handle.port = arg;
					handle.address = address || null;
				} else { // port is a path (string)
					handle.path = arg;
				}
			},
			connect : function(fd,arg,address) {
				var handle = Sockets[fd],
					found = false;
				handle.peer = null;
				// see if there is a peer to connect to
				if (arg >= 0) { // arg is a port
					for (var k in Sockets){
						var h = Sockets[k];
						found = h.readable				// peer is listening
								&& h.port == arg 		// ports match
								&& (! h.address || h.address == address);	// peer listens on ANY IP or IP match

						if (found){
							handle.peer = h.fd;
							// in progress until peer 'accepts'
							handle.error = EINPROGRESS;
							break;
						}
					}
					if (!found)
						// No one listening on the remote address.
						// http://linux.die.net/man/2/connect
						handle.error = ECONNREFUSED; 
					
					// mark as writable: see net.js, line 731
					// triggers write watcher which checks error state
					handle.writable = true;

				} else { // arg is a path (string)
					// TODO
					throw 'TODO connect to unix socket';
					handle.path = arg;
				}
			},				
			close : function(fd){
				
				console.log('close socket fd',fd);
				
				if (fd in Sockets) {
					var handle = Sockets[fd];
					delete handle.buffer;
					delete Sockets[fd];
					// TODO reuse fd.. add to reuse list
				}
				return 0; // success
			},
			shutdown : function(fd,how){
				if (fd in Sockets){
					var handle = Sockets[fd];
					how = how || 'write';  // default: see node_net2.cc 
					if (how == 'write' || how == 'readwrite') handle.writable = false; 
					if (how == 'read'  || how == 'readwrite') handle.readable = false;
				}
				return 0; // success
			},
			socketError : function(fd){
				return Sockets[fd].error;
			},
			listen : function(fd,backlog){
				var handle = Sockets[fd];
				handle.readable = true;
			},
			// accept a pending connection on fd
			accept : function(fd){
				var handle = Sockets[fd],
					found = false;
				// who is trying to connect?
				for (var k in Sockets){
					var peer = Sockets[k];
					if (peer.peer == fd 
						&& ! peer.connected) // prevent multiple connections
						{
						peer.connected = true;
						peer.error = 0;	// trigger success on peer
						return {  // peerInfo
							fd		: peer.fd,
							port	: peer.port,
							address	: peer.address 
						}
					}
				}
				return null;
			},
			// read from fd into buffer: offset & length refer to buffer
			read : function(fd, buffer, offset, length){
				if (!(fd in Sockets)) throw 'fd not in socket for read: ' + fd;
				var handle = Sockets[fd];
				if (! handle.buffer.length) return 0; 
									// (target, targetStart, sourceStart, sourceEnd)
				var bytesRead = handle.buffer.copy(buffer,offset,0,handle.buffer.length) 
				delete handle.buffer;
				handle.buffer = new Buffer();
				// mark it writable
				handle.readable = false;
				handle.writable = true;
				return bytesRead;
			},
			// write to fd from buffer
			write : function(fd, buffer, offset, length){
				// allocate space on sockets buffer
				if (!(fd in Sockets)) throw 'fd not in socket for write: ' + fd;
				var handle = Sockets[fd];
				delete handle.buffer;
				handle.buffer = new Buffer(length);
									// (target, targetStart, sourceStart, sourceEnd)
				var bytesWritten = buffer.copy(handle.buffer,0,offset,offset+length);
				// mark it readable
				handle.readable = true;
				handle.writable = false;
				return bytesWritten;
			},

			// TODO................

			toRead      : function(){debugger}, 
			setNoDelay  : function(){debugger},
			setKeepAlive: function(){debugger},
			getsockname : function(){debugger},
			errnoException : function(errno, syscall){
				return new Error('errnoException: errno='+errno+', syscall='+syscall);
			},
			
			// err no's are system dependent... but we don't care since
			// everything happens here!
			EINPROGRESS : EINPROGRESS,	// "Operation now in progress"
			ECONNREFUSED: ECONNREFUSED,	// "Connection refused"
			ENOENT      : ENOENT,		// "No such file or directory"
			EMFILE      : EMFILE		// "Too many open files"
		};
	
	case 'signal_watcher':
	case 'child_process':
	case 'crypto':
	case 'evals':
		
	default:
		throw new Error('No such module');
	}
};


/*
 * HTTPParser
 */

var CRLF = "\r\n";

function HTTPParser(type){
	this.reinitialize(type);
}
HTTPParser.prototype = {}
HTTPParser.prototype.execute = function(buffer, offset, length){
	
	this.onMessageBegin();
	if (length <= 0) { 
		this.onMessageComplete();
		return 0;
	}
	
	var data = buffer.toString('utf-8',/* start */offset,/* stop */offset+length);	// enc??
	
	var header,body;
	[header, body] = data.split(CRLF+CRLF);
	
	var info = {};
	var headers = header.split(CRLF);
	for (var i=0, l=headers.length; i<l; i++){
		var parts, 
			line = headers[i];
		// first line is the request/response line
		if (i==0) {
			parts = line.split(' ');
			if (this.type == 'request') {
				// GET /path/file.html HTTP/1.0
				info.method = parts[0].toUpperCase();
				this.incoming.url = parts[1];

				var v = parts[2].match(/HTTP\/(\d+)\.(\d+)/);

				if (!v) { 
					debugger;
				}
				
				info.versionMajor = parseInt(v[1],10) || 1;
				info.versionMinor = parseInt(v[2],10) || 0;
			} else {	
				// response
				// HTTP/1.0 200 OK
				info.statusCode = parts[1];
			}
			continue;
		}
		// headers, eg
		// Content-Type: text/html
		parts = splitOnFirst(line,':');

		// to simplify: not calling onHeaderField/Value since the take buffer
		// slice and we've already done toString conversion.
		this.incoming._addHeaderLine(trim(parts[0]), trim(parts[1]));
		
		if (/Upgrade/i.test(parts[0])) 
			info.upgrade = true;
		if (/Connection/i.test(parts[0]) && /keep-alive/i.test(parts[1])) 
			info.shouldKeepAlive = true;
		
		// TODO handle multilline headers!!
	}
	
	this.onHeadersComplete(info);
	
	bytesParsed = header.length + 2 * CRLF.length;
	
	// exit rest if upgrade
	if  (info.upgrade){
		this.onMessageComplete();
		bytesParsed -= 1; /* http.js line 617 */		// TODO !!!!!!???
		return bytesParsed;
	}
	
	// parse body
	// TODO chunk encoding
	// for now send everything....
	this.onBody(buffer, offset + bytesParsed, length - bytesParsed);
	bytesParsed = length;
	
	// done!
	this.onMessageComplete();
	return bytesParsed;
}

HTTPParser.prototype.finish = function(){
	throw 'was i supposed to do somptin with it!?';
}
HTTPParser.prototype.reinitialize = function(type){
	if (! /^(request|response)$/.test(type)) throw new Error("Argument be 'request' or 'response'");
	this.type = type;
}



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

process.IOWatcher = (function(){
	var watchers = [],
		timer = null,
		next = 0;
		POLL_INTERVAL = 1720;	// msec
	
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
				haveData = (w.__isReadable && handle.readable)	// socket is listening
						|| (w.__isWritable && handle.writable)
						;// || handle.buffer.length > 0; // have data ????
			} else {
				// socket must have closed -- shutdown watchers!! 
				// TODO  is this safe????
				w.stop();
				//return;
			}
			
			console.log(next-1,'--- watching w, fd, havedata: ', w, fd
					, w.__isReadable ? 'readable' : (w.__isWritable ? 'writable' : 'X')
					, haveData, handle && handle.buffer.length);
			
			
			// TODO blocking or non-blocking call!!!???
			// TODO blocking or non-blocking call!!!???
			// TODO blocking or non-blocking call!!!???
			if (haveData && w.callback && handle) {
// defer(bindTo(w,w.callback), handle.readable, handle.writable);
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
			
			console.log('== stopping watcher ', index, index>=0 && watchers[index]);
			
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
 * Stat
 */
function makeStat(path, callback){
	if (typeof path == 'number')	// = fd
		path = Handles[path].path;
	
	var stat = new Stats(),
		err = Error('file not found: '+path);

	err.path = path;
	
	// check for file existance, throws error if not found
	var ok, size, lastmod;
	[ok, size, lastmod] = getFileStat(path);
	if (!callback && !ok)	// throw immedi on sync
		throw err;

	mixin(stat, // mock data!
		{ dev: 2049
        , ino: 305352
        , mode: (path=='.' || path[path.length-1]=='/' ? process.S_IFDIR : process.S_IFREG) // hackish!!
        , nlink: 12
        , uid: 1000
        , gid: 1000
        , rdev: 0
        , size: size
        , blksize: size
        , blocks: 1
        , atime: new Date('2009-06-29T11:11:55Z')
        , mtime: new Date('2009-06-29T11:11:40Z')
        , ctime: new Date('2009-06-29T11:11:40Z')
        });
	
	if (callback)
		return defer(callback,!ok && err,stat);
	else 
		return stat;
}

/*
 * Buffer
 */

var MAX_BUFFER_SIZE = 4096; 		// TODO temp!!

function Buffer(arg, encoding) {
	this.length = 0;
	if (typeof arg == 'string') {
		
		var b = new Buffer();
		b.length = b.write(arg,encoding,0);
		return b;
		
		encoding = encoding || 'utf8';
		return Buffer._fromString(arg);
		
	} else if (typeof arg == 'number') {
		
		arg = Math.min(arg,MAX_BUFFER_SIZE);	// temp!!
		
		this.length = arg;
		for (var i=0; i<arg; i++) this[i] = 0;
	} else if (arg instanceof Array) {
		for (var i=0; i<arg.length; i++) this[i] = arg[i];
		this.length = arg.length;
	} 
}
Buffer.prototype = {};

// slice: Buffer is optimized not to copy slices
// TODO: optimize slice
Buffer.prototype.slice = Array.prototype.slice;	// TODO slice MUST reference
												// original buffers!!

Buffer.prototype.binarySlice = function(start, stop){
	for (var str='', i=start; i<stop; i++)
		str += String.fromCharCode(this[i] & 255);
	return str;
}
	// slice
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
	offset = offset || 0
	for (var i=0, l=string.length; i<l; i++){
		this[i+offset] = string.charCodeAt(i) & 255; // & 127 !!!!! (7-bit)
	}	
	Buffer._charsWritten = string.length;
	return l;
}
Buffer.prototype.binaryWrite = function(string, offset){
	offset = offset || 0
	for (var i=0, l=string.length; i<l; i++){
		this[i+offset] = string.charCodeAt(i) & 255;
	}	
	return l;
}
Buffer.prototype.utf8Write = function(string, offset){
	offset = offset || 0
	var encodedStr = unescape(encodeURIComponent(string));
	for (var i=0, l=encodedStr.length; i<l; i++){
		this[i+offset] = encodedStr.charCodeAt(i);
	}	
	Buffer._charsWritten = string.length;
	return l;
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
	// source is this!
	if (!(target instanceof Buffer)) throw Error('First arg should be a Buffer');
	// TODO: arg check...
	targetStart = targetStart || 0;
	sourceStart = sourceStart || 0;
	sourceEnd = sourceEnd || this.length;
	var toCopy = Math.min(sourceEnd - sourceStart, target.length - targetStart);
	if (toCopy == 0) return 0;
	
	// GOTCHA: concat deflates one level of array [x] --> x! May not be
	// intended!!
	var	sourceBytes = this.slice(sourceStart, sourceEnd),
		args = [targetStart, toCopy].concat(sourceBytes);
	
	pSplice.apply(target,args);
	return toCopy;
}

Buffer.byteLength = function(string,encoding){
	return string.length; // TODO
}
Buffer._charsWritten = 0;


/*
 * locals
 */

var 
	pSplice = Array.prototype.splice,
	pSlice = Array.prototype.slice;


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
	return [ok,content];
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
	return [ok,size,lastmod];
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

function mixin(dest, source){
	for (var key in source) {
		dest[key] = source[key];
	}
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
	var p = str.split(token);
	return [p[0], p.slice(1).join(token) ];
}


})();
