require("../common");

process.stdout.addListener("drain", function () {
	console.log(this.fd.toString());
	this.fd = new Buffer(4096);
});


print("hello world\r\n");

		

		return;

		

var stdin = process.openStdin();

stdin.addListener("data", function (data) {
	process.stdout.write(data.toString());
});

stdin.addListener("end", function () {
  process.stdout.end();
});
