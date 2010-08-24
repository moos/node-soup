
var	eout = document.getElementById('eout'),
	ein = document.getElementById('ein'),
	history = [], cursor = 0, lastLine = '', storage = window.sessionStorage;


loadHistory();

var 
  helpHint = "Type \'.help\' for options\n",
  prompt = "<span class='prompt'>node> </span>",
  repls, server, client, timer;


var print = function (msg){
	eout.innerHTML += msg.replace(/\n/g,'<br/>');
//	document.body.scrollTop = document.body.scrollHeight;
	window.scrollTo(0, eout.scrollHeight + 60);
};

writeError = function (msg){
	print('<div class="error">'+msg+'</div>');
}

print(helpHint);
ein.focus();



document.getElementById('form').addEventListener('submit',function(ev){
	ev.preventDefault();
	ev.stopPropagation();
	
	if (process.mainModule.exited)
		return false;
		
	if (ein.value !== '') {
		history.push(ein.value);
		if (history.length > 30) history.shift();
		cursor = history.length;
		saveHistory(cursor-1, ein.value);
	} else {
		ein.value += '\n';
	}

	///////////////client.write( ein.value );

	print(ein.value + '\n');
	ein.value = '';
	return false;
}, false);

eout.addEventListener('click',function(ev){
	ein.focus();
	return true;
},false);

ein.addEventListener('keydown',function(ev){
	var dir = 0;
	if (ev.keyCode == 38)	// up
		dir = -1;
	else if (ev.keyCode == 40) // down
		dir = +1;
	else if (ev.keyCode == 27) {	// escape
		ein.value = '';
		return false;
	}
	else
		return;

	ev.preventDefault();
	ev.stopPropagation();

	if (cursor == history.length)
		lastLine = ein.value;
	var next = cursor+dir;
	if (next >= 0 && next < history.length) {
		ein.value = history[next];
		cursor = next;
	}
	if (next == history.length) {
		ein.value = lastLine;
		++cursor; 
	}
	return false;
}, false);

window.clearDisplay = function(){
	eout.innerHTML='';
	print(helpHint + prompt);
	ein.focus();
	return false;
}
window.clearHistory = function() {
	if (storage) storage.clear();
	history = []; 
	cursor = 0;
	ein.focus();
	return false;
}

function saveHistory(index,value){
	if (storage)
		storage.setItem(index, value);
}
function loadHistory(){
	if (storage) {
		for (var i=0, l=storage.length; i<l; i++)
			history[i] = storage.getItem(i);
		cursor = history.length;
	}
}

