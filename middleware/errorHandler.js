var router = require('express').Router();


router.use(function(err, req, res, next) {
    console.log(err);
    res.status(500).json({error: 'Something went terribly wrong!'})

});


module.exports = router;