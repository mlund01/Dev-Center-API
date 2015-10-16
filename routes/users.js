var express = require('express');
var router = express.Router();
var Underscore = require('underscore');



function verifyKeys(key, errors) {

}

router.get('/', function(req, res) {
  db.collection('users').findOne({Identity: req.User.Identity}, {Identity: 0, _id: 0}, function(err, data) {
    if (err) {
      res.status(500).json({msg: 'Could not process request', error: err});
    } else {
      res.status(200).json(data);
    }
  })
});

router.post('/oc-vars', function(req, res) {
  if (!req.body) {
    res.status(406).json({error: 'request body is required'})
  } else if (Underscore.size(req.body) > 1) {
    res.status(406).json({error: 'cannot add more than one variable at a time'})
  } else {

    db.collection('users').updateOne({Identity: req.User.Identity}, {"$push": {"Courses.OcVars": {key: Underscore.keys(req.body)[0], val: Underscore.values(req.body)[0]}}}, function(err, data) {
      if (err) {
        res.status(500).json({msg: 'could not add value', error: err});
      } else if (data.result.nModified == 0){
        res.status(404).json({error: 'Could not find user'})
      } else {
        res.status(204).send();
      }

    })
  }
});

router.get('/oc-vars', function(req, res) {
  db.collection('users').findOne({Identity: req.User.Identity}, function(err, data) {
    if (err) {
      res.status(500).json({msg: 'Could not get variables', error: err})
    } else {
      res.status(200).json(data.Courses.OcVars);
    }
  })
});

router.delete('/oc-vars', function(req, res) {
  if (!req.body) {
    res.status(406).json({error: 'request body is required'})
  } else if (Underscore.size(req.body) > 1) {
    res.status(406).json({error: 'cannot add more than one variable at a time'})
  } else {

    db.collection('users').updateOne({Identity: req.User.Identity, "Courses.OcVals.key": Underscore.keys(req.body)[0]}, {"$unset": {"Courses.OcVals.$": ""}}, function(err, data) {
      if (err) {
        res.status(500).json({msg: 'could not add value', error: err});
      } else if (data.result.nModified == 0){
        res.status(404).json({error: 'Could not update'})
      } else {
        res.status(204).send();
      }
    })
  }
});

router.patch('/oc-vars', function(req, res) {
  if (!req.body) {
    res.status(406).json({error: 'request body is required'})
  } else if (Underscore.size(req.body) > 1) {
    res.status(406).json({error: 'cannot add more than one variable at a time'})
  } else {
    db.collection('users').updateOne({Identity: req.User.Identity}, {"$pull": {"Courses.OcVars": req.body}}, function(err, data) {
      if (err) {
        res.status(406).json({msg: 'Cannot update object at this time', error: err});
      } else if (data.result.nModified == 0) {
        res.status(406).json({error: 'Variable could not be found'});
      } else {
        res.status(204).send();
      }
    })
  }
});

module.exports = router;
