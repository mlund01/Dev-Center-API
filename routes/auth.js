var router = require('express').Router();
var jwt = require('jsonwebtoken');
var crypto = require('crypto');

var algorithm = 'aes-256-ctr';
var password = app.get('encryption_key');



router.post('/', function(req, res) {
    if (!req.query.email || !req.query.username) {
        res.status(400).json({error: 'Username or Email Required in request for token'})
    } else {
        db.collection('users').findOne({Email: req.query.email},
            function(err, data ){
                if (data) {
                    console.log(data);
                    var token = jwt.sign(data.Email, app.get('secret_key'), {
                        expiresIn: 140000000
                    });
                    res.status(200).json({access_token: token});
                }
                else if (err) {
                    res.status(400).json({error: err});
                } else {
                    db.collection('users').insertOne({Email: req.query.email},
                        function(err) {
                            if (!err) {
                                var token = jwt.sign(req.query.email, app.get('secret_key'), {
                                    expiresIn: 140000000
                                });
                                res.status(200).json({access_token: token});
                            }

                        })
                }
            });
    }

});



module.exports = router;