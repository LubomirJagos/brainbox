#!/usr/bin/env node
// Load the http module to create an http server.
const express = require('express');
const fs = require('fs');
const app = express();
const http = require('http').Server(app);
const path = require('path');
const childProcess = require('child_process')
const phantomjs = require('phantomjs')
const bodyParser = require('body-parser');
const glob = require("glob");


const io = require('./src/comm/websocket').connect(http, { path: '/socket.io'});
const mqtt = require('./src/comm/hive-mqtt').connect(io, "freegroup/brainbox");
const raspi = require("./src/comm/raspi").connect(io);

// Tell the bodyparser middleware to accept more data
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));

// application specific configuration settings
//
const arduino = require("./src/comm/arduino");
const storage= require("./src/storage.js");
const shapeDirApp = path.normalize(__dirname + '/../shapes/')
const shape2CodeDir = path.normalize(__dirname + '/../shape2code/')


// Determine the IP:PORT to use for the http server
//
const address = require("./src/network");
const port = 7400;


// =======================================================================
// Check how many Arduinos are connected to serial port and
// ask to user which one to use.
//
// =======================================================================
arduino.init(io, runServer);


// =======================================================================
//
// The main HTTP Server and socket.io run loop. Serves the HTML files
// and the socket.io access point to change/read the GPIO pins if the server
// is running on an Raspberry Pi
//
// =======================================================================
function runServer() {
  // provide the  WebApp with this very simple
  // HTTP server. Good enough for an private raspi access
  //
  app.use('/circuit/shapes', express.static(shapeDirApp));
  app.use(express.static(__dirname + '/../frontend'));
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.get('/', (req, res) => res.redirect('/circuit'));

  // =================================================================
  // Handle brain files
  //
  // =================================================================
  app.get('/backend/brain/list',    (req, res) => storage.listFiles(storage.brainDirUserHOME,      req.query.path,     res));
  app.get('/backend/brain/get',     (req, res) => storage.getJSONFile(storage.brainDirUserHOME,    req.query.filePath, res));
  app.get('/backend/brain/image',   (req, res) => storage.getBase64Image(storage.brainDirUserHOME, req.query.filePath, res));
  app.post('/backend/brain/delete', (req, res) => storage.deleteFile(storage.brainDirUserHOME,     req.body.filePath, res));
  app.post('/backend/brain/rename', (req, res) => storage.renameFile(storage.brainDirUserHOME,     req.body.from, req.body.to, res));
  app.post('/backend/brain/save',   (req, res) => {
    fs.writeFile(storage.brainDirUserHOME + req.body.filePath, req.body.content,  (err) =>{
      res.send('true');
      io.sockets.emit("brain:generated", {
        filePath: req.body.filePath
      });
    });
  });


  // =================================================================
  // Handle shape files
  //
  // =================================================================
  app.get('/backend/shape/list',    (req, res) => storage.listFiles(shapeDirApp,      req.query.path,     res))
  app.get('/backend/shape/get',     (req, res) => storage.getJSONFile(shapeDirApp,    req.query.filePath, res))
  app.get('/backend/shape/image',   (req, res) => storage.getBase64Image(shapeDirApp, req.query.filePath, res))
  app.post('/backend/shape/delete', (req, res) => storage.deleteFile(shapeDirApp,     req.body.filePath, res))
  app.post('/backend/shape/rename', (req, res) => storage.renameFile(shapeDirApp,     req.body.from, req.body.to, res))
  app.post('/backend/shape/save',   (req, res) => {
    fs.writeFile(shapeDirApp + req.body.filePath, req.body.content,  (err) =>{
      if(err) throw err

      // file is saved...fine
      //
      res.send('true');

      // create the js/png/md async to avoid a blocked UI
      //
      let binPath = phantomjs.path
      let childArgs = [
        path.normalize(__dirname+'/../shape2code/converter.js'),
        path.normalize(shapeDirApp + req.body.filePath),
        shape2CodeDir,
        shapeDirApp
      ]

      // inform the browser that the processing of the
      // code generation is ongoing
      //
      io.sockets.emit("shape:generating", {
        filePath: req.body.filePath
      });

      console.log(binPath, childArgs[0], childArgs[1],childArgs[2],childArgs[3])
      childProcess.execFile(binPath, childArgs, function(err, stdout, stderr) {
        if(err) throw err
        let pattern = (shapeDirApp + req.body.filePath).replace(".shape",".*")
        glob(pattern, {}, function (er, files) {
          files.forEach( file =>{
            fs.copyFile(file ,file.replace(shapeDirApp, storage.shapeDirUserHOME), (err) => {
              if (err) throw err;
            })
          })
        })

        io.sockets.emit("shape:generated", {
          filePath: req.body.filePath,
          imagePath: req.body.filePath.replace(".shape",".png"),
          jsPath: req.body.filePath.replace(".shape",".js")
        });
      })
    });
  });


  http.listen(port, function () {
    console.log('using phantomJS for server side rendering of shape previews:', phantomjs.path)
    console.log('+------------------------------------------------------------+');
    console.log('| Welcome to brainbox - the begin of something awesome       |');
    console.log('|------------------------------------------------------------|');
    console.log('| System is up and running. Copy the URL below and open this |');
    console.log('| in your browser: http://' + address + ':' + port + '/                |');
    console.log('|                  http://localhost:' + port + '/                    |');
    console.log('+------------------------------------------------------------+');
  });
}
