var router = require('express').Router();
var jwt = require('jsonwebtoken');
var crypto = require('crypto');

var algorithm = 'aes-256-ctr';
var password = app.get('encryption_key');


function encrypt(text){
    var cipher = crypto.createCipher(algorithm,password);
    var crypted = cipher.update(text,'utf8','hex');
    crypted += cipher.final('hex');
    return crypted;
}

router.post('/', function(req, res) {
    if (req.body.Email || req.body.Username) {
        var hash = encrypt("{Email: " + req.body.Email || null + ", Username: " + req.body.UserName || null + "}");
        db.collection('users').findOne({Identity: hash}, function(err, data) {
            if (data) {
                res.status(401).json({error: 'User already exists'})
            } else {
                var newUser = {
                    Identity: hash,
                    Admin: req.body.Admin || false
                };
                db.collection('users').insertOne(
                    newUser,
                    function(err, data) {
                        if (!err) {
                            db.collection('users').findOne({Identity: hash}, {_id: 0}, function(err, data) {
                                if (!err) {
                                    res.status(200).json(data);
                                } else {
                                    res.status(401).json({error: 'User made but could not be fetched'})
                                }
                            });
                        } else {
                            res.status(401).json({error: 'Could Not Create New User', mongoError: err})
                        }
                })
            }
        });

    } else {
        res.status(401).json({error: "Must provide 'Email' or 'UserName'"})
    }
});

router.post('/update/:identity', function(req, res) {
    if (req.body.Email || req.body.Username) {
        var hash = encrypt("{Email: " + req.body.Email || null + ", Username: " + req.body.UserName || null + "}");
        db.collection('users').replaceOne({Identity: req.params.identity},
            {
                Identity: hash,
                Admin: req.body.Admin || false
            },
            function(err, data) {
                if (err) {
                    res.status(405).json({error: "Cannot update user at this time", mongoError: err});
                } else if (data.result.nModified == 0) {
                    res.status(404).json({error: "User not found"});
                } else {
                    db.collection('users').findOne({Identity: hash}, {_id: 0}, function(err, data) {
                        if (!err) {
                            res.status(200).json(data);
                        } else {
                            res.status(401).json({error: 'User made but could not be fetched'})
                        }
                    });
                }
        })
    } else {
        res.status(405).json({error: "Must provide either 'Email' or 'Username'"})
    }
});

module.exports = router;