var router = require('express').Router();
var analytics = require('../middleware/analytics');

router.use(function (req, res, next) {
    if (req.AccessGranted) {
        next();
    } else {
        res.status(403).json({error: 'Access has been denied for this request'})
    }
});

router.post('/consoleevent', function(req, res) {
    if (!req.body) {
        res.status(400).json({error: 'must provided request body for keen event'})
    } else {
        analytics.consoleEvent(req.body, req.User);
        res.status(204).send();
    }
});

router.post('/createorgevent', function(req, res) {
    if (!req.body) {
        res.status(400).json({error: 'must provided request body for keen event'})
    } else {
        analytics.createOrgEvent(req.body, req.User);
        res.status(204).send();
    }

});


module.exports = router;
