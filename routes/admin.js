var router = require('express').Router();
var jwt = require('jsonwebtoken');


var password_1 = app.get('encryption_key_1');



router.post('/registeruser', function(req, res) {
    console.log('hit!');
    console.log(req.body);
    if (!req.query.secret_key || req.query.secret_key != password_1) {
        res.status(403).json({msg: 'secret_key is incorrect or not provided'})
    } else {
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
            var hash = req.body.MongoDBHash;
            db.collection(req.UserEnv).findOne({Identity: hash}, function(err, data) {
                if (data) {
                    registerEvent(false, "User already exists");
                    res.status(401).json({error: 'User already exists'});
                } else {
                    console.log(req.body);
                    var newUser = {
                        Identity: hash,
                        Admin: false,
                        Username: req.body.Username,
                        Email: req.body.Email,
                        FirstName: req.body.FirstName,
                        LastName: req.body.LastName
                    };
                    db.collection(req.UserEnv).insertOne(
                        newUser,
                        function(err, data) {
                            if (!err) {
                                registerEvent(true);
                                res.status(204).send();
                            } else {
                                registerEvent(false, "mongo error on create user");
                                res.status(401).json({error: 'Could Not Create New User', mongoError: err});
                            }
                        })
                }
            });

        } else {
            res.status(401).json({error: "Must provide 'Email' or 'UserName'"});
            registerEvent(false, "mongo error on find user");
        }
    }

});

/*router.use(function(req, res, next) {
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
});*/



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