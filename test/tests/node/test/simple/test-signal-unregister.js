require("../common");

var childKilled = false, done = false,
    spawn = require('child_process').spawn,
    sys = require("sys"),
    child;

var join = require('path').join;

child = spawn(process.argv[0], [join(fixturesDir, 'should_exit.js')]);
child.addListener('exit', function () {
  if (!done) childKilled = true;
});

setTimeout(function () {
  console.log("Sending SIGINT");
  child.kill("SIGINT");
  setTimeout(function () {
    console.log("Chance has been given to die");
    done = true;
    if (!childKilled) {
      // Cleanup
      console.log("Child did not die on SIGINT, sending SIGTERM");
      child.kill("SIGTERM");
    }
  }, 200);
}, 200);

process.addListener("exit", function () {
  assert.ok(childKilled);
});