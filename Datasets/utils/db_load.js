var readline = require('readline');
var fs = require('fs');
var pg = require('pg');
var async = require('async');
var config = require('../../config.json');

var now = new Date().getTime();

function loadDataAsMeasurements(filename, timeCol, valueCol, isTimeRelative, callback) {
  var rl = readline.createInterface({
    input: fs.createReadStream(filename)
  });

  var measurements = [];

  rl.on('close', function () {
    callback(measurements);
  });

  var isFirst = true;
  rl.on('line', function (line) {

    // Because is a CSV
    if (isFirst) {
      isFirst = false;
      return;
    }

    var values = line.split(',');

    var time = null;
    var timestr = values[timeCol];
    if (timestr.match(/^[0-9]+\.[0-9]+$/)) {
      var vt = timestr.split('.');
      time = new Date(parseInt(vt[0]) * 1000 + parseInt(vt[1])).getTime() / 1000;
    } else {
      time = isTimeRelative ?
          parseInt(timestr) / 1000
          : new Date(timestr).getTime() / 1000;
    }

    measurements.push({
      time: strDate ? timestr : time,
      value: parseFloat(values[valueCol])
    });

  });
}

function loadMeasurementsDescription(filename, callback) {
  var rl = readline.createInterface({
    input: fs.createReadStream(filename)
  });

  var measurementsDescription = [];

  rl.on('close', function () {
    callback(measurementsDescription);
  });

  var isFirst = true;
  rl.on('line', function (line) {

    // Because is a CSV
    if (isFirst) {
      isFirst = false;
      return;
    }

    measurementsDescription.push(line.split(','));
  });
}

function loadMeasurementSeriesDescription(filename, callback) {
  var rl = readline.createInterface({
    input: fs.createReadStream(filename)
  });

  var measurementSeriesDescription = [];

  rl.on('close', function () {
    callback(measurementSeriesDescription);
  });

  var isFirst = true;
  rl.on('line', function (line) {

    // Because is a CSV
    if (isFirst) {
      isFirst = false;
      return;
    }

    measurementSeriesDescription.push(line.split(','));
  });
}

function checkMeasurementTable(client, callback) {
  client.query("create table if not exists Measurement (" +
      "    sname character varying(20) NOT NULL," +
      "    snum character varying NOT NULL," +
      "    \"time\" timestamp without time zone NOT NULL," +
      "    value double precision" +
      ");",
      function (err, result) {
        if (err) console.error('error running query', err);
        client.query("GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;", function (err, result) {
          if (err) console.error('error running query', err);
          callback(err);
        });
      }
  );
}

function checkMeasurementDescriptionTable(client, callback) {
  client.query("create table if not exists MeasurementDescription (" +
      "    key character varying NOT NULL," +
      "    description character varying," +
      "    relativetime boolean," +
      "    xaxisdesc character varying," +
      "    yaxisdesc character varying," +
      "    xaxistype character varying," +
      "    yaxistype character varying," +
      "    xaxisformat character varying" +
      ");",
      function (err, result) {
        if (err) console.error('error running query', err);
        client.query("GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;", function (err, result) {
          if (err) console.error('error running query', err);
          callback(err);
        });
      }
  );
}

function checkMeasurementSeriesDescriptionTable(client, callback) {
  client.query("create table if not exists MeasurementSeriesDescription (" +
      "    measurementkey character varying NOT NULL," +
      "    measurementseries character varying NOT NULL," +
      "    description character varying\n" +
      ");",
      function (err, result) {
        if (err) console.error('error running query', err);
        client.query("GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;", function (err, result) {
          if (err) console.error('error running query', err);
          callback(err);
        });
      }
  );
}


var pool = new pg.Pool({
  connectionString: config.database.connectionString,
});
var filename;
var type = process.argv[2];

// Example
// node db_load.js measurements sname snum valueCol timeCol isTimeRelative datasetFilename
if (type === 'measurments') {
  var sname = process.argv[3];
  var snum = process.argv[4];
  var timeCol = parseInt(process.argv[5]);
  var valueCol = parseInt(process.argv[6]);
  var isTimeRelative = process.argv[7] === 'true';
  var strDate = process.argv[8] === 'true';
  filename = process.argv[9];


  loadDataAsMeasurements(filename, timeCol, valueCol, isTimeRelative, function (measurements) {
    pool.connect(function (err, client, done) {
      if (err) return console.error('could not connect to postgres', err);

      function insertMeasurement(item, callback) {
        console.log('inserting ', item, ' in ', sname, ' ', snum);
        client.query(strDate ?
            'insert into Measurement values ($1, $2, $3, $4);' :
            'insert into Measurement values ($1, $2, to_timestamp($3), $4);',
            [sname, snum, item.time, item.value],
            function (err, result) {
              if (err) console.error('error running query', err);
              callback(err);
            }
        );
      }

      checkMeasurementTable(client, function () {
        async.each(measurements, insertMeasurement, function (err) {
          if (err) {
            console.log('there was an error');
          }
          done();
          pool.end();
        });
      });

    });
  });

}

// node db_load.js descriptions descriptionsFilename
if (type === 'descriptions') {
  filename = process.argv[3];

  loadMeasurementsDescription(filename, function (measurementsDescription) {
    pool.connect(function (err, client, done) {
      if (err) return console.error('could not connect to postgres', err);

      function insertMeasurementDescription(description, callback) {
        console.log('inserting ', description, ' in ', sname, ' ', snum);
        client.query('insert into MeasurementDescription(' +
            'key,description,relativetime,xaxisdesc,yaxisdesc,xaxistype,yaxistype,xaxisformat' +
            ') values ($1, $2, $3, $4, $5, $6, $7, $8);',
            description,
            function (err, result) {
              if (err) console.error('error running query', err);
              callback(err);
            }
        );
      }

      checkMeasurementDescriptionTable(client, function () {
        async.each(measurementsDescription, insertMeasurementDescription, function (err) {
          if (err) {
            console.log('there was an error');
          }
          done();
          pool.end();
        });
      });
    });

  });
}

if (type === 'seriesDescriptions') {
  filename = process.argv[3];

  loadMeasurementSeriesDescription(filename, function (measurementsSeriesDescription) {
    pool.connect(function (err, client, done) {
      if (err) return console.error('could not connect to postgres', err);

      function insertMeasurementSeriesDescription(description, callback) {
        console.log('inserting ', description, ' in ', sname, ' ', snum);
        client.query('insert into MeasurementSeriesDescription(' +
            'measurementkey,measurementseries,description' +
            ') values ($1, $2, $3);',
            description,
            function (err, result) {
              if (err) console.error('error running query', err);
              callback(err);
            }
        );
      }

      checkMeasurementSeriesDescriptionTable(client, function () {
        async.each(measurementsSeriesDescription, insertMeasurementSeriesDescription, function (err) {
          if (err) {
            console.log('there was an error');
          }
          done();
          pool.end();
        });
      });
    });

  });
}

