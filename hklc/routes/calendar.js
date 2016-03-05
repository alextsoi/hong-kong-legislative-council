var express = require('express');
var router = express.Router();
var config = require('../config.json');

var request = require('request');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
var _ = require("underscore");
var moment = require('moment');

var mongoose = require('mongoose');
mongoose.connect( config.mongo.host );
/**
 * Define the holiday schema
 * @type {[type]}
 */
var Schema = mongoose.Schema;
var holidaySchema = new Schema({
	date: Date
});
holidaySchema.index({date: 1}, {unique: true});
var Holiday = mongoose.model('Calendar_Holiday', holidaySchema);

/**
 * Schedule of legco
 * @param  {[type]} req   [description]
 * @param  {[type]} res   [description]
 * @param  {[type]} next) {	res.json({		todo: "Schedule of council"	});} [description]
 * @return {[type]}       [description]
 */
router.get('/schedule', function(req, res, next) {
	res.json({
		todo: "Schedule of council"
	});
});

/**
 * Retrieve the holiday list
 * @param  {[type]} req   [description]
 * @param  {[type]} res   [description]
 * @param  {[type]} next) {		var       holidays [description]
 * @return {[type]}       [description]
 */
router.get('/holiday', function(req, res, next) {
	// Retrieve the holidays
	var holidays = Holiday.find({}).select('date').sort({date:'asc'}).exec(function(err, holidays){
		if(err){
			res.send({
				message: 'Error exists - ' + err.message
			});
		}else{
			var list = [];
			_.each(holidays, function(holiday){
				var parsedDate = moment(holiday.date).format('YYYY-MM-DD');
				list.push(parsedDate);
			});
			res.json(list);
		}
	});
});

/**
 * Update the holiday list from legco
 * @param  {[type]} req                                              [description]
 * @param  {[type]} res                                              [description]
 * @param  {[type]} next){		request(config.calendar.holiday.update, function(error, response, body){		if(!error && response.statusCode [description]
 * @return {[type]}                                                  [description]
 */
router.get('/holiday/update', function(req, res, next){
	// Update the holiday from hkgov
	request(config.calendar.holiday.update, function(error, response, body){
		if(!error && response.statusCode == 200){
			parser.parseString(body, function(err, result){
				if(err) console.log(err);
				if(typeof result.GetHolidayResponse.LESS[0].Holiday != "undefined"){
					var holidays = result.GetHolidayResponse.LESS[0].Holiday;
					for(var i = 0 ; i < holidays.length ; i++){
						var holiday = holidays[i];
						var day = new Holiday({ date: holiday});
						day.save(function(e){
							// Ignore error handling
							console.log(e);
						});
					}
				}
				res.send({status: 'Success'});
			});
		}else{
			console.log('Error in fetching the holiday');
			console.log('Status Code : ' + response.statusCode);
			console.log('Error : ' + error);
			res.json({
				message: 'Error in fetching the holiday',
				status_code: response.statusCode,
				error: error
			});
		}
	});
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
