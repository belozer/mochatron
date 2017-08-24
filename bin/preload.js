'use strict';

const path = require('path');
const sliced = require('sliced');
const electron = require('electron');

let reporter = undefined;
if(process.env.MOCHA_PHANTOM_REPORTER){
    reporter = require(path.resolve(process.env.MOCHA_PHANTOM_REPORTER));
}

var mochatron = {
    run: function(cb) {
        var mocha = window.mocha;
        mocha.setup({ reporter: reporter || 'spec', useColors : true });
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
(function(){
    // listen for console.log
    var defaultLog = console.log;
    console.log = function() {
        sendMsg('console', 'log', sliced(arguments));
        return defaultLog.apply(this, arguments);
    };

    // listen for console.warn
    var defaultWarn = console.warn;
    console.warn = function() {
        sendMsg('console', 'warn', sliced(arguments));
        return defaultWarn.apply(this, arguments);
    };

    // listen for console.error
    var defaultError = console.error;
    console.error = function() {
        sendMsg('console', 'error', sliced(arguments));
        return defaultError.apply(this, arguments);
    };

    // overwrite the default alert
    window.alert = function(message){
        sendMsg('page', 'alert', message);
    };

    // overwrite the default prompt
    window.prompt = function(message, defaultResponse){
        sendMsg('page', 'prompt', message, defaultResponse);
    }

    // overwrite the default confirm
    window.confirm = function(message, defaultResponse){
        sendMsg('page', 'confirm', message, defaultResponse);
    }
})()
