var throng = require('throng');
var WORKERS = 2;

throng(start, {
    workers: WORKERS,
    lifetime: Infinity
});


function start() {
    var express = require('express');
    app = express();
    var MongoClient = require('mongodb').MongoClient;
    var uri = "mongodb://devadmin:fails345@ds039024-a0.mongolab.com:39024,ds039024-a.mongolab.com:39024/451devcenter?replicaSet=rs-ds039024";
    var bodyParser = require('body-parser');
    var localConfig = require('./localConfig');
    var Keen = require('keen-js');
    keen = new Keen({
            projectId: '561c1f5946f9a76e5db2583c',
            writeKey: '8fa38f0e5ff7444be52eb0fa8cee4fd5291753cce940c5895179bcf9c75cbeb9b9416383bf7b060f5b8f20521cb2c4933a88fd6065a89a2e27e4dbda7196e4ff835c3bceb064667810b57e32d33198345b6dff5c83f8ab9c386ce55b4afb3305a4aa94b3b81a1ff1e5ec1a74fc905577'
        }
    );

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



    app.set('secret_key', process.env.SECRET_KEY || localConfig.env.SECRET_KEY);
    app.set('encryption_key_1', process.env.CRYPTO_KEY_1 || localConfig.env.CRYPTO_KEY_1);
    app.set('encryption_key_2', process.env.CRYPTO_KEY_2 || localConfig.env.CRYPTO_KEY_2);
    app.set('encryption_iv', localConfig.env.CRYPTO_IV);
    app.use(bodyParser.json());

    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, authorization, Administrator, dc-token, Identity, environment");
        res.header("Access-Control-Allow-Methods", "GET, PUT, POST, PATCH, DELETE, OPTIONS");
        //res.header("Access-Control-Allow-Headers", "*");
        next();
    });



//Middleware
    app.use(require('./middleware/middleware'));


//app.use('/test', require('./routes/test'));
    app.use('/authenticate', require('./routes/auth'));
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
}




