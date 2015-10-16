var router = require('express').Router();
var jwt = require('jsonwebtoken');
var crypto = require('crypto');
var algorithm = 'aes-256-ctr';
var password = app.get('encryption_key_2');

function decrypt(text){
    var decipher = crypto.createDecipher(algorithm, password);
    var dec = decipher.update(text,'hex','utf8');
    dec += decipher.final('utf8');
    return dec;
}

router.use(function(req, res, next) {
    var token = req.headers['dc-token'];
    if (token) {
        jwt.verify(token, app.get('secret_key'), function(err, decoded) {
            if (err) {
                return res.status(404).json({error: 'Unauthorized', msg: 'Your authorization token is invalid'})
            } else {
                try {
                    var decryptedID = decrypt(decoded);
                } catch(err) {
                    res.status(400).json({error: err.toString(), msg: 'Your authorization token is invalid.'})
                }
                if (decryptedID) {
                    db.collection('users').findOne({Identity: decryptedID}, {_id: 0}, function(err, data) {
                        if (!err && data) {
                            req.User = data;
                            next();
                        } else {
                            res.status(404).json({error: 'Unauthorized', msg: 'User could not be found'})
                        }
                    });
                }

            }
        })
    } else {
        return res.status(404).json({error: 'Unauthorized', msg: 'You must provide an authorization token.'})

    }
});


module.exports = router;