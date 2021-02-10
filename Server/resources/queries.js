var express = require('express');
var readline = require('readline');
var router = express.Router();
var config = require('../../config.json');
var influent = require('influent');
var async = require('async');
var pg = require('pg');

var predefinedQueries = require('./predefinedQueries');
var fnQueries = require('./fnQueries');

router.get('/predefinedQueries', function(req, res, next) {
  res.send(predefinedQueries);
});

router.get('/fnQueries', function(req, res, next) {
  res.send(fnQueries);
});

module.exports = router;
