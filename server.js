var express = require('express');
app = express();
var MongoClient = require('mongodb').MongoClient;
var uri = "mongodb://devadmin:fails345@ds039024-a0.mongolab.com:39024,ds039024-a.mongolab.com:39024/451devcenter?replicaSet=rs-ds039024";
var bodyParser = require('body-parser');

MongoClient.connect(uri, function(err, database) {
    db = database;
    console.log('connected to database');
});

if (process.argv[2] == 'dev') {
    var server = app.listen(55555, function () {
        var port = server.address().port;
        console.log('Example app listening on port: ',  port);

    });
} else {
    var server = app.listen(process.env.PORT, function () {
        var port = server.address().port;
        console.log('Example app listening on port: ',  port);
    });
}



app.set('secret_key', process.env.SECRET_KEY || 'dslfdjlkdj');
app.set('encryption_key_1', process.env.CRYPTO_KEY_1 || 'dkdkdkd');
app.set('encryption_key_2', process.env.CRYPTO_KEY_2 || 'jsgfdg');
app.use(bodyParser.json());

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, authorization, Administrator, dc-token, Identity");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, PATCH, DELETE, OPTIONS");
    //res.header("Access-Control-Allow-Headers", "*");
    next();
});





//Unauthenticated Endpoints
app.use('/authenticate', require('./routes/auth'));

//Middleware
app.use(require('./middleware/middleware'));

//Authenticated Endpoints
app.use('/admin', require('./routes/admin'));
app.use('/courses', require('./routes/courses'));
app.use('/users', require('./routes/users'));


/*
app.use(function(err, req, res, next) {
    console.log(err);
    res.status(500).json({error: err})

});
*/

//app.use(require('./middleware/errorHandler'));



