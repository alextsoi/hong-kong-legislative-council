var express = require('express');
var router = express.Router();
var config = require('../config.json');

var request = require('request');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
var _ = require("underscore");
var moment = require('moment');

var mongoose = require('mongoose');
if(mongoose.connection.readyState != 1 && mongoose.connection.readyState != 2) mongoose.connect( config.mongo.host );

var Schema = mongoose.Schema;
var voteSchema = new Schema({
	meta: {
		'start-date': String,
		'meeting-type': String
	},
	vote: {
		type: Array,
		default: []
	}
});
// voteSchema.index({'meta.start-date': 1}, {unique: true});
var Vote = mongoose.model('Vote', voteSchema);

router.get('/', function(req, res, next) {
	// Retrieve the schedule
	var votes = Vote.find({}).sort({DateTime:'asc'}).exec(function(err, votes){
		if(err){
			res.send({
				message: 'Error exists - ' + err.message
			});
		}else{
			res.json(votes);
		}
	});
});

var mapShortToLong = {
    "$": "meta"
};

function refit_keys(o){
    var build, key, destKey, ix, value;

    build = {};
    for (key in o) {
        // Get the destination key
        destKey = mapShortToLong[key] || key;

        // Get the value
        value = o[key];

        // If this is an object, recurse
        if (typeof value === "object") {
            value = refit_keys(value);
        }

        // Set it on the result using the destination key
        build[destKey] = value;
    }
    return build;
}

router.get('/update', function(req, res, next){
	var fail = null;
	for(var i = 0; i < config.vote.process.length;i++){
		var url = config.vote.process[i];
		request(url, function(error, response, body){
			if(!error && response.statusCode == 200){
				parser.parseString(body, function(err, result){
					if(err) console.log(err);
					if(typeof result['legcohk-vote'].meeting != "undefined"){
						var meeting = result['legcohk-vote'].meeting[0];
						meeting = refit_keys(meeting);
						meeting.meta['meeting-type'] = meeting.meta['type'];
						delete meeting.meta['type'];
						Vote.findOneAndUpdate({
							'meta.start-date': meeting.meta['start-date']
						}, meeting, {
							upsert: true
						}, function(e, doc){
							console.log(e);
						});
					}
				});
			}else{
				console.log('Error in fetching the vote record');
				console.log('Status Code : ' + response.statusCode);
				console.log('Error : ' + error);
				fail = {
					message: 'Error in fetching the vote record',
					status_code: response.statusCode,
					error: error
				};
			}
		});
	}
	if(fail != null) res.json(fail);
	else res.json({status: 'Success'});
});

/**
 * Catch invalid route
 * @param  {[type]} req                           [description]
 * @param  {[type]} res                           [description]
 * @param  {[type]} next){	res.json({		message: 'Invalid      route'	});} [description]
 * @return {[type]}                               [description]
 */
router.get('/*', function(req, res, next){
	res.json({
		message: 'Invalid route'
	});
});

module.exports = router;