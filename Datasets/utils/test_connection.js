var readline = require('readline');
var pg = require('pg');
var config = require('../../config.json');

console.log('TEST CONNECTION');
var pool = new pg.Pool({
  connectionString: config.database.connectionString,
});
pool.connect(function(err, client, done) {
  console.log('client connect callback');
  if(err) {
    return console.error('could not connect to postgres', err);
  }
  client.query('SELECT NOW() AS "theTime"', function(err, result) {
    if(err) {
      return console.error('error running query', err);
    }
    console.log('CONNECTION WORKING.')
    console.log(result.rows[0].theTime);
    done();
  });
});

pool.end();