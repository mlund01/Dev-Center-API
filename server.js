var express = require('express');
var app = express();
var MongoClient = require('mongodb').MongoClient;
var uri = "mongodb://devadmin:fails345@ds029804.mongolab.com:29804/451devcentertest";


MongoClient.connect(uri, function(err, database) {
    db = database;
    console.log('connected to database');
});

var server = app.listen(3000, function () {
    var port = server.address().port;
    console.log('Example app listening on port: ',  port);
});

app.use('/courses', require('./routes/courses'));


