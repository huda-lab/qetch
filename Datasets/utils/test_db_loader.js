var readline = require('readline');
var fs = require('fs');
var pg = require('pg');
var async = require('async');

var conString = "postgres://miro:@localhost/qetch";

var now = new Date().getTime();

function loadDataAsMeasurements(filename, timeCol, valueCol, isTimeRelative, callback) {
    var rl = readline.createInterface({
        input: fs.createReadStream(filename)
    });

    var measurements = []; 

    rl.on('close', function() {
        callback(measurements);
    });

    var isFirst = true;
    rl.on('line', function(line) {
        
        // Because is a CSV
        if (isFirst) {
            isFirst = false;
            return;
        }

        var values = line.split(',');

        var time = null;
        var timestr = values[timeCol];
        if (timestr.match('^[0-9]+\.[0-9]+$')) {
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

// TO call as:
// node db_loader.js sname snum valueCol timeCol isTimeRelative datasetFilename

var sname = process.argv[2];
var snum = process.argv[3];
var timeCol = parseInt(process.argv[4]);
var valueCol = parseInt(process.argv[5]);
var isTimeRelative = process.argv[6] === 'true';
var strDate = process.argv[7] === 'true';
var filename = process.argv[8];

loadDataAsMeasurements(filename, timeCol, valueCol, isTimeRelative, function (measurements) {
    pg.connect(conString, function(err, client, done) {
    if(err) return console.error('could not connect to postgres', err);

    function insertMeasurement(item, callback) {
        console.log('inserting ', item, ' in ', sname, ' ', snum);
        client.query(strDate ? 
            'insert into Measurement values ($1, $2, $3, $4)' :
            'insert into Measurement values ($1, $2, to_timestamp($3), $4)', 
            [sname, snum, item.time, item.value], 
            function(err, result) {
                if (err) console.error('error running query', err);
                callback(err);
            }
        );
    }

    async.each(measurements, insertMeasurement, function (err) {
        if (err) console.log('there was an error');
            done();
            pg.end();
        }); 
    });
});