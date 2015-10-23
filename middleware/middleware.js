var router = require('express').Router();
var jwt = require('jsonwebtoken');
var crypto = require('crypto');
var algorithm = 'aes-256-ctr';
var password_1 = app.get('encryption_key_1');
var password_2 = app.get('encryption_key_2');

function decrypt(text){
    var decipher = crypto.createDecipher(algorithm, password_2);
    var dec = decipher.update(text,'hex','utf8');
    dec += decipher.final('utf8');
    return dec;
}

function encrypt(text){
    var cipher = crypto.createCipher(algorithm, password_1);
    var crypted = cipher.update(text,'utf8','hex');
    crypted += cipher.final('hex');
    return crypted;
}

router.use(function(req, res, next) {
    if (req.method == 'OPTIONS') {
        res.status(200).end();
    } else {
        var token = req.headers['dc-token'];
        if (token) {
            if (req.originalUrl == '/admin/registeruser') {
                req.AccessGranted = false;
                next();
            } else {
                jwt.verify(token, app.get('secret_key'), function(err, decoded) {
                    if (err) {
                        req.AccessGranted = false;
                        next();
                    } else {
                        try {
                            var decryptedID = decrypt(decoded);
                            var id = encrypt(decryptedID);
                        } catch(err) {
                            req.AccessGranted = false;
                            next();
                        }
                        if (decryptedID) {
                            db.collection('users').findOne({Identity: id}, {_id: 0}, function(err, data) {
                                if (!err && data) {
                                    req.AccessGranted = true;
                                    req.User = data;
                                    next();
                                } else {
                                    res.status(406).json({msg: 'Token accepted but user could not be found'})
                                }
                            });
                        }

                    }
                })
            }
        } else {
            req.AccessGranted = false;
            next();
        }
    }

});


module.exports = router;