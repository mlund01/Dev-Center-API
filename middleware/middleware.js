var router = require('express').Router();
var jwt = require('jsonwebtoken');

router.use(function(req, res, next) {
    if (req.method == 'OPTIONS') {
        res.status(200).end();
    } else {
        next();
    }
});

router.use(function(req, res, next) {
    if (req.headers.environment == 'test') {
        req.UserEnv = 'testusers';
        next();
    } else if (req.headers.environment == 'prod') {
        req.UserEnv = 'users';
        next();
    } else if (req.headers.environment == 'qa') {
        req.UserEnv = 'qausers';
        next()
    } else if (req.headers.environment == 'local') {
        req.UserEnv = 'localusers';
        next()
    }
    else {
        res.status(403).json({error: '"Environment" Header must be set to "test", "qa", or "prod"'})
    }

});

router.use(function(req, res, next) {
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
                    db.collection(req.UserEnv).findOne({Identity: decoded}, {_id: 0}, function(err, data) {
                        if (!err && data) {
                            req.AccessGranted = true;
                            req.User = data;
                            next();
                        } else {
                            res.status(406).json({msg: 'Token accepted but user could not be found'})
                        }
                    });
                }
            })
        }
    } else {
        req.AccessGranted = false;
        next();
    }

});


module.exports = router;