var express = require('express');
var app = express();
var MongoClient = require('mongodb').MongoClient;
var uri = "mongodb://devadmin:fails345@ds029804.mongolab.com:29804/451devcentertest";
var bodyParser = require('body-parser');

MongoClient.connect(uri, function(err, database) {
    db = database;
    console.log('connected to database');
});

var server = app.listen(55555, function () {
    var port = server.address().port;
    console.log('Example app listening on port: ',  port);
});
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, authorization");
    next();
});

app.use(bodyParser.json());
app.use('/courses', require('./routes/courses'));


