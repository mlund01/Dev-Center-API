var router = require('express').Router();
var jwt = require('jsonwebtoken');

var algorithm = 'aes-256-ctr';
var password = app.get('encryption_key');

function decrypt(text){
    var decipher = crypto.createDecipher(algorithm,password);
    var dec = decipher.update(text,'hex','utf8');
    dec += decipher.final('utf8');
    return dec;
}

router.use(function(req, res, next) {
    var token = req.headers['auth'];
    if (token) {
        jwt.verify(token, app.get('secret_key'), function(err, decoded) {
            if (err) {
                return res.status(404).json({error: 'Unauthorized', msg: 'Your authorization token is invalid'})
            } else {
                req.decoded = decoded;
                next();
            }
        })
    } else {
        return res.status(404).json({error: 'Unauthorized', msg: 'You must provide an authorization token.'})
    }
});


module.exports = router;