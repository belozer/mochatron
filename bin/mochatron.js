#!/usr/bin/env node

var spawn = require('npm-execspawn');
var path = require('path');
var args = process.argv.slice(2);
// Determine if valid args were passed in from command line.
var validArgs = args.some(function(arg) {
  var protocol = arg.substring(0, 4);
  return (protocol === 'file' || protocol === 'http');
});

function main(options) {
  var config = require('./config');
  var appScript = path.join(__dirname, '/app.js');

  if (options) {
    // Reset args because its not being used from the commandline.
    args = [];
    if (options.silent) args.push('-s');
    if (options.window) args.push('-w');
    if (options.url) args.push(options.url);
  }

  var child = spawn('electron "' + appScript
    + '" ' + args.join(' '));

    child.stdout.pipe(process.stdout)
    process.stdin.pipe(child.stdin)

    child.stderr.on('data', function (data) {
        var str = data.toString('utf8')
        // it's Chromium, STFU
        if (str.match(/^\[\d+\:\d+/)) return
        process.stderr.write(data)
    })
    child.on('exit', function (code) { process.exit(code) })
  return child;
}

if (require.main === module) { // Called directly.
  if (validArgs) {
    main();
  } else {
    console.log('Invalid arguments passed.');
  }
}

module.exports = main;
