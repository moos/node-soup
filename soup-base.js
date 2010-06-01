// node-soup: 
// 	define process, etc. as defined in node.cc

var 
	process={}, 
	global = window,	/////
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
		descriptor.get && document.__defineGetter__(prop, descriptor.get);
		descriptor.set && document.__defineSetter__(prop, descriptor.set);
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
process = new EventEmitter();		// process is-a EventEmitter (node_events.cc)
	//process.EventEmitter.prototype is extended in events.js
	//with process.addListener & process.removeListener, etc 	

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
	// noop
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

// TODO - probably send to worker thread!!
process._needTickCallback = function(){
	// just call queued callbacks - no ticks involved
	process._tickCallback();
}

// empties / noop
process.checkBreak = 
process.kill =
process.reallyExit =
	emptyFunction;


// need native handling !?? 
process.emit = function(type /*,args*/){	// node.cc <-- node_events.cc  (process is a EventEmitter)
	console.log(' >> process.emit', arguments)
	// var args = pSlice.call(arguments);
	// this.emit.call(this,args);
}



process.compile = function(source, file){
	//console.log('compile:',arguments);
	
	var	bindingToken = nativeMarker + file + nativeMarker;
	if (source.indexOf(bindingToken) != -1){
		// read file and insert into source at token 'file'
		
		var [ok, content] = getFileContent('lib/'+file+'.js');		// path is hardcoded!!!
		
		source = source.replace(bindingToken, content);
	}

	//console.log(source);
	return eval(source);
};


var natives = null,
	nativeMarker = '::',
	Handles = {},
	NEXT_FD = 3;	// 0 stdin, 1 stdout, 2 stderr
	
function Stats(){}	//prototyped in fs.js
function Channel(){}

function fd_handle(path,flags,mode){
	this.path = path;
	this.flags = flags;
	this.mode = mode;
	this.fd = NEXT_FD++;
	this.eof = false;
	Handles[this.fd] = this;
}

process.binding = function(module){
	//console.log('binding:',arguments);
	
	return (function(){
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
						return defer(callback,/*err*/null,handle.fd);

					return handle.fd; 
				},
				close : function(fd, callback){
					if (fd in Handles) { 
						delete Handles[fd];
					}
					if (callback)
						defer(callback,/*err*/null);
				},
				// read all at once
				read : function(fd, buffer, offset, length, position, callback){
					var bytesRead = 0, ok=true, content;
					if (fd instanceof Buffer){
						bytesRead = fd.copy(buffer,offset,position,position+length);
						// TODO : remove from fd!????? as in STDIN
					} else {
						var handle = Handles[fd];
						if (!handle.eof) {
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
				// TODO!!!!!!!!!!!!!
				write : function(fd, buffer, offset, length, position, callback){
					
					//console.log(':: write', arguments, typeof fd, typeof fd.write);
					
					//require('buffer');
					
					var str = buffer.toString(/*encoding*/'', offset, offset+length);
					if (fd.asciiWrite) {
						fd.asciiWrite(str,position);   // TODO ????????????? encoding
					} else if (typeof fd == 'string'){
						fd += str;
					}
					// TODO: handle non-string fd's

					var handle = fd in Handles ? Handles[fd] : null;
					if (handle) fd = handle.fd;
					
					if (callback) {
						return defer(callback,null,fd);
					}
					return str.length;
				}
			}; 
			
		case 'buffer':
			return {Buffer: Buffer};
			
		case 'stdio':
			// TODO  stdout/in should be EventEmitter  --- streams!!!????
			return {
				stdoutFD: new Buffer(4096),
				writeError: function(msg){
					console.log(msg);
					// TODO	
					//STDERR += msg + "\r\n";
				},
				openStdin: function(){ return new Buffer(1024) },
				isStdoutBlocking: function(){ return true },
				isStdinBlocking: function(){ return true }
			}
			
		case 'cares':
			//Channel.prototype = {}
			return {
				Channel: Channel,
				isIP : function(){return 4;}, // TODO
				AF_INET : 0,//?
				AF_INET6 : 0,//?
				SOCKET_BAD : -1, //?
				
				A:1, AAAA:26, MX:15, TXT:16, SRV:33, PTR:12, NS:2,
				// ERROR CODES
				NODATA : 1,		FORMERR : 2,	BADRESP : 10,	NOTFOUND : 4,
				BADNAME : 8,	TIMEOUT : 12,	CONNREFUSED:11,	NOMEM : 15,	
				DESTRUCTION:16,	NOTIMP : 5,		EREFUSED : 6, 	SERVFAIL : 3
			}
			
		default:
			console.log('binding: unhandled module:',module)
			return {}
		}
	})();
};

/*
 * Timer
 *	 process.Timer is used by net.js and dns.js as well as to define global.<timer> functions
 *	 @ref: http://search.cpan.org/~mlehmann/EV-3.8/libev/ev.pod
 *
 *	 TODO: handle drift (don't trigger more often than 'repeat') 
 *	 TODO: move to worker thread!!?
 */
process.Timer = function(){
	this.calllback = null;
	this.timeout = 0;
	this._repeat = 0;
	this._timer = null;
}
process.Timer.prototype = {
	// values in msec
	start: function(after, repeat){
		if (arguments.length != 2) throw Error('Bad arguments');
		this.timeout = after;
		this._repeat = repeat;
		var self = this;
		this._timer = setTimeout(function(){
			if (typeof self.callback != 'function')
				return; //throw Error('timer callback not a function');
			if (repeat > 0) 
				self._timer = setInterval(self.callback,repeat);
			else {
				self._timer = null;
			}
			self.callback();
		},after);
	},
	stop: function(){
		if (!this._timer) return;
		clearTimeout(this._timer); 
		clearInterval(this._timer);
		this._timer = null;
	},
	again: function(repeat){
		this.stop();
		if (repeat > 0)
			this.start(0,repeat);
	},
	get repeat() {
		return this._repeat;
	},
	set repeat(val) {
		this._repeat = val;
		//TODO: reset timer?!
	}	
}

/*
 * Stat
 */
function makeStat(path, callback){
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
        , mode: 16877
        , nlink: 12
        , uid: 1000
        , gid: 1000
        , rdev: 0
        , size: size
        , blksize: size
        , blocks: 1
        , atime: '2009-06-29T11:11:55Z'
        , mtime: '2009-06-29T11:11:40Z'
        , ctime: '2009-06-29T11:11:40Z' 
        });
	
	if (callback)
		return defer(callback,!ok && err,stat);
	else 
		return stat;
}

/*
 * Buffer
 */
function Buffer(arg, encoding) {
	this.length = 0;
	if (typeof arg == 'string') {
		
		var b = new Buffer();
		b.length = b.write(arg,encoding,0);
		return b;
		
		encoding = encoding || 'utf8';
		return Buffer._fromString(arg);
		
	} else if (typeof arg == 'number') {
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
Buffer.prototype.slice = Array.prototype.slice;	// TODO slice MUST reference original buffers!!

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
	return l;
}
// from: node_buffer.cc
//buffer.unpack(format, index);
//Starting at 'index', unpacks binary from the buffer into an array.
//'format' is a string
//
//FORMAT  RETURNS
// N     uint32_t   a 32bit unsigned integer in network byte order
// n     uint16_t   a 16bit unsigned integer in network byte order
// o     uint8_t    a 8bit unsigned integer
//
// NOTE: Javascript bitwise operators are 'signed' 32-bit int's. Convert to unsinged manually with >>>0;
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
	
	// GOTCHA: concat deflates one level of array [x] --> x! May not be intended!!
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
 * local vars
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
		xhr.open('GET',path, /*async*/null);
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
		//console.log(this.getAllResponseHeaders());
		size = parseInt(this.getResponseHeader("Content-Length"),10);	
		lastmod = this.getResponseHeader("Last-Modified");
	}, false);
	xhr.addEventListener('error',function(ev){
		console.info('error ', path, arguments);
		ok = false;
	}, false);
	
	try{
		xhr.open('HEAD',path, /*async*/null);
		xhr.send();
		if (xhr.status == 404) 
			ok = false;
	} catch(e){
		// likely a file not found
		throw e;
	}
	return [ok,size,lastmod];
}

// defer a callback
function defer(cb /*,args*/){
	var args = pSlice.call(arguments,1);
	setTimeout(function(){cb.apply(cb,args);},0);
}

function mixin(dest, source){
	for (var key in source) {
		dest[key] = source[key];
	}
}

})();
