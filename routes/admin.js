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

router.post('/kyle_test', function(req, res) {

    var decrypted = decrypt(req.query.MongoDBHash, password_1);
    res.status(200).json({value: decrypted});
});

router.post('/registeruser', function(req, res) {

    function registerEvent(Pass, Msg) {
        var eventObj = {
            Username: req.body.Username,
            Email: req.body.Email,
            FirstName: req.body.FirstName,
            LastName: req.body.LastName,
            Pass: Pass,
            Message: Msg | null
        };
        keen.addEvent("registration", eventObj, function(err, res) {
            if (err) {
                console.log("could not log registration event");
            } else if (res.created) {
                console.log("registation event successfully logged");
            }
        })
    }


    if (req.body.Email || req.body.Username) {
        var hash = encrypt("{Email: " + (req.body.Email || null) + ", Username: " + (req.body.UserName || null) + "}", password_1);
        db.collection(req.UserEnv).findOne({Identity: hash}, function(err, data) {
            if (data) {
                res.status(401).json({error: 'User already exists'});
                registerEvent(false, "User already exists");
            } else {
                var newUser = {
                    Identity: hash,
                    Admin: false,
                    Username: req.body.Username,
                    Email: req.body.Email,
                    FirstName: req.body.FirstName | null,
                    LastName: req.body.LastName | null
                };
                db.collection(req.UserEnv).insertOne(
                    newUser,
                    function(err, data) {
                        if (!err) {
                            db.collection(req.UserEnv).findOne({Identity: hash}, {_id: 0, Admin: 0}, function(err, data) {
                                if (!err) {
                                    data.UserHash = encrypt("{Email: " + (req.body.Email || null) + ", Username: " + (req.body.UserName || null) + "}", password_2);
                                    delete data.Identity;
                                    res.status(200).json(data);
                                    registerEvent(true);
                                } else {
                                    res.status(401).json({error: 'User made but could not be fetched'});
                                    registerEvent(false, "User made but could not be fetched");
                                }
                            });
                        } else {
                            res.status(401).json({error: 'Could Not Create New User', mongoError: err});
                            registerEvent(false, "mongo error on create user");
                        }
                    })
            }
        });

    } else {
        res.status(401).json({error: "Must provide 'Email' or 'UserName'"});
        registerEvent(false, "mongo error on find user");
    }
});

router.use(function(req, res, next) {
    if (req.AccessGranted) {
        next();
    } else {
        res.status(403).json({error: 'Access has been denied for this request'})
    }
});

router.use(function(req, res, next) {
    if (req.User.Admin) {
        next();
    } else {
        res.status(403).json({error: 'Must be an Admin User to Make Requests in ' + req.baseUrl})
    }
});


router.get('/getuseridentity', function(req, res) {
    if (!req.query.UserHash) {
        res.status(406).json({error: 'Must provided user hash as query param'})
    } else {
        var id = decrypt(req.query.UserHash, password_2);
        id = encrypt(id, password_1);
        db.collection(req.UserEnv).findOne({Identity: id}, {_id: 0, Identity: 1}, function(err, data) {
            if (err) {
                res.status(500).json({error: "Could not complete request at this time"})
            } else if (!data) {
                res.status(404).json({error: "User not found"})
            } else {
                res.status(200).json(data);
            }
        })
    }
});

router.get('/getuserhash', function(req, res) {
    if (req.query.Email || req.query.Username) {
        var id1 = encrypt("{Email: " + (req.query.Email || null) + ", Username: " + null + "}", password_1);
        var id2 = encrypt("{Email: " + null + ", Username: " + (req.query.UserName || null) + "}", password_1);
        var id3 = encrypt("{Email: " + (req.query.Email || null) + ", Username: " + (req.query.UserName || null) + "}", password_1);

        db.collection(req.UserEnv).findOne({Identity: {"$in": [id1, id2, id3]}}, function(err, data) {
            if (err) {
                res.status(500).json({error: err});
            } else if (data) {
                res.status(200).json({UserHash: encrypt(decrypt(data.Identity, password_1), password_2)})
            } else {
                res.status(404).json({error: 'User Not Found'})
            }

        })
    } else {
        res.status(404).json({error: "Must provide 'UserName' or 'Email' in query params"});
    }
});

/*router.post('/updateuser', function(req, res) {
    if (req.body.Email || req.body.Username) {
        var hash = encrypt("{Email: " + (req.body.Email || null) + ", Username: " + (req.body.UserName || null) + "}", password_1);
        try {
            var id = decrypt(req.query.identity, password_2);
        } catch(e) {
            res.status(405).json({msg: 'Incorrect Identity token or Identity token not provided', error: e.toString()})
        }
        if (id) {
            db.collection(req.UserEnv).replaceOne({Identity: id},
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
                        db.collection(req.UserEnv).findOne({Identity: hash}, {_id: 0}, function(err, data) {
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
});*/

router.delete('/deleteUser', function(req, res) {

});


module.exports = router;