var express = require('express');
var readline = require('readline');
var router = express.Router();
var config = require('../../config.json');
var fs = require('fs');

router.get('/:testName', function(req, res, next) {
  fs.readFile(__dirname + '/tests/' + req.params.testName, 'utf8', function (err, data) {
    if (err) return console.log(err);
    res.send(data).end();
  });
});

module.exports = router;
