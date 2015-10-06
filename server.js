var express = require('express');
var app = express();

app.get('/', function (req, res) {
    res.send('Hello World');
});

var server = app.listen(3000, function () {
    var host = server.address().address;
    var port = server.address().port;

    console.log('Example app listening at http://%s%s', host, port);
});


var MongoClient = require('mongodb').MongoClient;
var assert= require('assert');

var url = "mongodb://devadmin:fails345@ds029804.mongolab.com:29804/451devcentertest";

var courses = [
    {
        ID: 'intro',
        Name: 'Introduction',
        Description: 'Familiarize yourself with the OrderCloud RESTful API and the toolsets available for developing against it.',
        Difficulty: 'Beginner',
        Classes: ['api','ordercloud','tools','sdk'],
        ImgUrl: 'assets/intro.png'
    },
    {
        ID: 'basics',
        Name: 'The Basics',
        Description: 'A real-world, interactive introduction to help you get started using OrderCloud',
        Difficulty: 'Beginner',
        Classes: ['buyer-crud', 'user-crud', 'group-crud', 'group-assignment', 'prod-crud', 'price-sched-crud', 'prod-assignments', 'category-crud', 'category-prod-assignment', 'category-assignment'],
        ImgUrl: 'assets/basics.png'
    }
];

var insertClasses = function(db, callback) {
    courses.forEach(function(obj) {
        console.log(obj.ID);
        db.collection('courses').insertOne(obj,
        function(err, result) {
            assert.equal(err, null);
            console.log("Inserted document");
        });
    });
    callback();

};


MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log('Connected to dev center db');
    insertClasses(db, function() {
        db.close();
    })
});
