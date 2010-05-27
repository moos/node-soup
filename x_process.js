// nodejs-soup: define global

var 
	process={}, 
	global={},
	GLOBAL={}
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

//var Buff;

(function(){		// control scope!
	
process.global = {};
process.version = '0.1';
process.installPrefix = '';
process.platform = 'nodejs-x';
process.ARGV = process.argv = ['node','app-main-should-go-here!!!!']; 
process.ENV = process.env = {'NODE_DEBUG' : 0}; 
process.pid = 200; 

process.loop = function(){};
process.unloop = function(){};
process._byteLength = function(){};
process._needTickCallback = function(){};
process.reallyExit = function(){};
process.chdir = function(){};
process.cwd = function(){return '.';};
process.getuid = function(){};
process.setuid = function(){};
process.setgid = function(){};
process.getgid = function(){};
process.umask = function(){};
process.dlopen = function(){};
process.kill = function(){};
process.memoryUsage = function(){};
process.checkBreak = function(){};
process.EventEmitter = function(){};

process.addListener = 
process.removeListener = function(){};	// TODO	

process.compile = function(source, file){
	console.log('compile:',arguments);
	
	var marker = '::', 
		bindingToken = marker + file + marker;
	
	if (source.indexOf(bindingToken) != -1){
		// read file and insert into source at token 'file'
		var content = getFile('lib/'+file+'.js');
		source = source.replace(bindingToken, content);
	}

	//console.log(source);
	return eval(source);
};


process.binding = function(module){
	console.log('binding:',arguments);
	
	var natives = null;	// private class property	// FIXME!!!!!
	var emptyFunction = function(){};
	
	return (function(){
		var marker = '::';
		switch (module) {
		case 'natives':
			if (natives) return natives;
			natives = {};
			'assert buffer child_process dns events file freelist fs http crypto ini mjsunit net posix querystring repl sys tcp uri url utils path module utf8decoder'
				.split(' ').map(function(n){natives[n] = marker+n+marker;});
			return natives;
			
		case 'fs':
			return {
				// TODO::::: missing many fs bindings!!!!!!!!!
				
				Stats : emptyFunction,
				stat : function(path, callback){
					var struct = {}; // TODO!!
					if (callback)
						callback(struct);
					else 
						return struct;
				},
				open : function(path, flags, mode){
					return path; // fd is path!
				},
				close : emptyFunction,

				// read all at once
				read : function(fd, buffer, offset, length, position){
					if (offset > 0) throw 'offset > 0 currently not supported!';
					// for subsequent reads, return 0 to end while loop!
					if (position > 0) return 0;
					
					buffer.asciiWrite(getFile(fd),0);
					return buffer.length;
				}
			}; 
			
		case 'buffer':
			
			
			var Buffer = function(arg){
				if (typeof arg == 'string')
					return Buffer._fromString(arg);
					//return new String(arg);
				else if (typeof arg == 'number')
					;//this.length = arg;
				// TODO: handle other types!! (needs testing!!)
			};

			Buff = Buffer;

			// internal method!
			Buffer._fromString = function(str) {
				var source = str.split(''),
					target = new Buffer(source.length);
				
				Buffer.prototype.copy.call(source,target,0,0);
				return target;
			}
				
			Buffer.prototype = new Array();

			// slice: Buffer is optimized not to copy slices
			// TODO: optimize slice
			Buffer.prototype.slice = Array.prototype.slice;

			Buffer.prototype.binarySlice =
			Buffer.prototype.asciiSlice =
			Buffer.prototype.utf8Slice = function(start, end){
				return this.slice(start,end).join('');
			};

			Buffer.prototype.utf8Write =
			Buffer.prototype.asciiWrite =
			Buffer.prototype.binaryWrite = function(string, offset){
				// TODO : optimize - copying x2!
				var b = new Buffer(string);
				b.copy(this, offset, 0);
			};
			Buffer.prototype.unpack =
				function(){ throw "unpack TBD";};
				
			Buffer.prototype.copy = function(target, targetStart, sourceStart, sourceEnd){
				// source is this!
				if (!(target instanceof Buffer)) throw 'First arg should be a Buffer';
				// TODO: arg check...
				sourceEnd = sourceEnd || this.length;
				var toCopy = Math.min(sourceEnd - sourceStart, target.length - targetStart);
				
				// GOTCHA: concat deflates one level of array [x] --> x! May not be intended!!
				var	sourceBytes = this.slice(sourceStart, sourceEnd),
					args = [targetStart, toCopy].concat(sourceBytes);
				
				target.splice.apply(target,args);
				return toCopy;
			};
			Buffer.prototype.byteLength = function(){return this.length;};
			Buffer._charsWritten = 0;

			return {Buffer: Buffer};
			
		case 'stdio': //tbd
		default:
			console.log('binding: unhandled module:',module)
			return {};
		}
	})();
};


// process.Timer is used by net.js and dns.js
// as well as to define global.<timer> functions
// @ref: http://search.cpan.org/~mlehmann/EV-3.8/libev/ev.pod
// TODO: handle drift (don't trigger more often than 'repeat' 
// TODO: move to worker thread!!?
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
 * local vars
 */

function getFile(path){
	var content = '';
	var xhr = new XMLHttpRequest();
	xhr.addEventListener('load',function(ev){
		console.info('loaded  ', arguments);
		content = ev.target.responseText;
	}, false);
	xhr.open('GET',path, /*async*/null);
	xhr.send();
	
	return content;
}



})();
