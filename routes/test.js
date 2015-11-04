var router = require('express').Router();
var oc = require('ordercloud-js-sdk');
router.get("", function(req, res) {
    res.status(200).send(oc.Test.Go());

});





module.exports = router;
