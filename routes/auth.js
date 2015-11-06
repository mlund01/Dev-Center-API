var router = require('express').Router();
var jwt = require('jsonwebtoken');
var crypto = require('crypto');


router.post('/', function(req, res) {
    if (!req.query.UserHash) {
        res.status(400).json({error: "UserHash value is required in params"})
    }
    else {
        db.collection(req.UserEnv).findOne({Identity: req.query.UserHash},
            function(err, data ){
                if (data) {
                    var token = jwt.sign(req.query.UserHash, app.get('secret_key'), {
                        expiresIn: 140000000
                    });
                    res.status(200).json({mongoToken: token});
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