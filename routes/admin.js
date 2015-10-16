var router = require('express').Router();
var jwt = require('jsonwebtoken');
var crypto = require('crypto');

var algorithm = 'aes-256-ctr';
var password_1 = app.get('encryption_key_1');
var password_2 = app.get('encryption_key_2');

function encrypt(text, pass){
    var cipher = crypto.createCipher(algorithm, pass);
    var crypted = cipher.update(text,'utf8','hex');
    crypted += cipher.final('hex');
    return crypted;
}

function decrypt(text, pass){
    var decipher = crypto.createDecipher(algorithm, pass);
    var dec = decipher.update(text,'hex','utf8');
    dec += decipher.final('utf8');
    return dec;
}

router.use(function(req, res, next) {
    if (req.User.Admin) {
        next();
    } else {
        console.log(req.User.Admin);
        res.status(405).json({error: 'Must be an Admin User to Make Requests in ' + req.baseUrl})
    }
});

router.post('/registeruser', function(req, res) {
    if (req.body.Email || req.body.Username) {
        var hash = encrypt("{Email: " + (req.body.Email || null) + ", Username: " + (req.body.UserName || null) + "}", password_1);
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
                                    data.UserHash = encrypt(data.Identity, password_2);
                                    delete data.Identity;
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

router.get('/getuseridentity', function(req, res) {

});

router.get('/getuserhash', function(req, res) {
    if (req.query.Email || req.query.Username) {
        var hash1 = encrypt("{Email: " + (req.query.Email || null) + ", Username: " + null + "}", password_1);
        var hash2 = encrypt("{Email: " + null + ", Username: " + (req.query.UserName || null) + "}", password_1);
        var hash3 = encrypt("{Email: " + (req.query.Email || null) + ", Username: " + (req.query.UserName || null) + "}", password_1);

        db.collection('users').findOne({Identity: {"$in": [hash1, hash2, hash3]}}, function(err, data) {
            if (data) {
                res.status(200).json({UserHash: encrypt(data.Identity, password_2)})
            } else {
                res.status(404).json({error: 'User Not Found'})
            }

        })
    } else {
        res.status(404).json({error: "Must provide 'UserName' or 'Email' in query params"});
    }
});

router.post('/updateuser', function(req, res) {
    if (req.body.Email || req.body.Username) {
        var hash = encrypt("{Email: " + (req.body.Email || null) + ", Username: " + (req.body.UserName || null) + "}", password_1);
        try {
            var id = decrypt(req.query.identity, password_2);
        } catch(e) {
            res.status(405).json({msg: 'Incorrect Identity token or Identity token not provided', error: e.toString()})
        }
        if (id) {
            db.collection('users').replaceOne({Identity: id},
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
                                data.UserHash = encrypt(data.Identity, password_2);
                                delete data.Identity;
                                res.status(200).json(data);
                            } else {
                                res.status(401).json({error: 'User made but could not be fetched'})
                            }
                        });
                    }
                })
        }

    } else {
        res.status(405).json({error: "Must provide either 'Email' or 'Username'"})
    }
});

router.delete('/deleteUser', function(req, res) {

});


module.exports = router;