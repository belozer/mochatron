'use strict';

const path = require('path');
var electron = require('electron');
// Use sprintf because the browser console.log does it, but node does not.
var sprintf = require('sprintf-js').sprintf;

let reporter = undefined;
if(process.env.MOCHA_PHANTOM_REPORTER){
    reporter = require(path.resolve(process.env.MOCHA_PHANTOM_REPORTER));
}

var mochatron = {
    run: function(cb) {
        var mocha = window.mocha;
        mocha.setup({ reporter: reporter || 'spec' });
        // Mocha needs a process.stdout.write in order to change the cursor position.
        Mocha.process = Mocha.process || {};
        Mocha.process.stdout = Mocha.process.stdout || process.stdout;
        Mocha.process.stdout.write = function(s) { sendMsg('mocha', 'stdout', s) };

        mocha.run(function(failCount) {
            cb();
            sendMsg('mocha', 'testRunEnded', failCount);
        });
    }
};

if (window) {
    window.mochatron = mochatron;

    window.onerror = function(message, filename, lineno, colno, err) {
        sendMsg('mocha', 'error', {
            message: message,
            filename: filename,
            err: err,
            stack: err.stack
        });
    };
}

function sendMsg(channel, type, message) {
    electron.ipcRenderer.send(channel, type, message);
}

// Taken from nightmare-js
(function() {
    // listen for console.log
    var defaultLog = console.log;
    console.log = function() {
        var message = sprintf.apply(this, [].slice.call(arguments));
        // This 'if' is kind hacky, not sure why 'stdout:' is being output to the console, maybe it's ANSI related?
        if (message !== 'stdout:') {
            electron.ipcRenderer.send('console', 'log', message);
            return defaultLog.apply(this, arguments);
        }
    };

    // listen for console.warn
    var defaultWarn = console.warn;
    console.warn = function() {
        var message = sprintf.apply(this, [].slice.call(arguments));
        electron.ipcRenderer.send('console', 'warn', message);
        return defaultWarn.apply(this, arguments);
    };

    // listen for console.error
    var defaultError = console.error;
    console.error = function() {
        var message = sprintf.apply(this, [].slice.call(arguments));
        electron.ipcRenderer.send('console', 'error', message);
        return defaultError.apply(this, arguments);
    };

    // overwrite the default alert
    window.alert = function(message) {
        electron.ipcRenderer.send('page', 'alert', message);
    };

    // overwrite the default prompt
    window.prompt = function(message, defaultResponse) {
        electron.ipcRenderer.send('page', 'prompt', message, defaultResponse);
    };

    // overwrite the default confirm
    window.confirm = function(message, defaultResponse) {
        electron.ipcRenderer.send('page', 'confirm', message, defaultResponse);
    };
})();
