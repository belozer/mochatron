'use strict';
const util = require('util');
const path = require('path');

var config = require('./config');
var program = require('commander');

// Handle command line usage.
program
    .version('1.0.6')
    .usage('[options] <url>')
    .option('-w, --window', 'Show window', false)
    .option('-s, --silent', 'Silently swallow errors', false)
    .parse(process.argv);

if (program.window) config.window = true;
if (program.silent) config.silent = true;
// Make sure the unknown args is a valid file or http URI.
if (program.args.length) {
    var protocol = program.args[0].substring(0, 4);
    if (protocol === 'file' || protocol === 'http') {
        config.url = program.args[0];
    }
}

// Show current config.
// console.log('Config: ' + JSON.stringify(config));

// Start handling electron stuff.
var electron = require('electron');
var app = electron.app;  // Module to control application life.
var ipc = electron.ipcMain;  // Module for inter-process communication.
var BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.
var preloadURL = 'file://' + __dirname + '/preload.js';

process.on('uncaughtException', function(err) {
    writeError(err);
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow;

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform != 'darwin') {
        app.quit();
    }
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
    // Create the browser window.
    mainWindow = new BrowserWindow({
        height: 1200,
        width: 1600,
        show: config.window,
        webPreferences: {
            preloadURL: preloadURL,
            nodeIntegration: false
        }
    });

    // and load the index.html of the app.
    mainWindow.loadURL(config.url);

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();

    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
});

ipc.on('console', function(event, type, message) {
    // Skip the type for now.
    console.log.apply(this, message);
});

ipc.on('error', function(event, errorCount) {
    console.error('Errors: ' + errorCount);
    if (!config.silent) {
        app.quit();
        // This might be redundant.
        process.exit(errorCount);
    }
});

ipc.on('mocha', function(event, type, data) {
    switch (type) {
        case 'stdout':
            break;
        case 'testRunEnded':
            if (data) {
                app.exit(1);
            }else{
                app.quit();
            }
            break;
        case 'error':
            writeError(data);
            break;
    }
});

function writeError(err) {
    console.log(util.format('\nError encountered in %s: %s\n%s',
        path.relative(process.cwd(), err.filename),
        err.message,
        err.stack));
    app.exit(1);
}

module.exports = app;
