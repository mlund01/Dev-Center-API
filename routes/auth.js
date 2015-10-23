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



router.post('/', function(req, res) {
    if (!req.query.UserHash) {
        res.status(400).json({error: "Identity value is required"})
    }
    else {
        var decrypted = decrypt(req.query.UserHash);
        var crypIdentity = encrypt(decrypted);
        db.collection('users').findOne({Identity: crypIdentity},
            function(err, data ){
                if (data) {
                    var token = jwt.sign(req.query.UserHash, app.get('secret_key'), {
                        expiresIn: 140000000
                    });
                    res.status(200).json({access_token: token});
                } else if (err) {
                    res.status(400).json({error: err});
                } else {
                    res.status(404).json({error: 'User not found'})
                }
            });
    }

});

router.use(function(req, res) {
    res.status(404).json({error: 'Not a valid request', method: req.method, endpoint: req.baseUrl + req.path})
});



module.exports = router;