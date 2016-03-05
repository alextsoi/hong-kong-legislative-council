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

var scheduleSchema = new Schema({
	RstStatus: String,
	ID: String,
	DateTime: Date,
	Date: String,
	Time: String,
	Venue_Code: String,
	Venue: {
		ID: String,
		EN: String,
		CH: String,
		Site: String,
		EngLoc: String,
		ChiLoc: String
	},
	Subject: {
		EN: String,
		CH: String
	},
	Agenda_Path:{
		En_Url: String,
		Ch_Url: String
	},
	Committees:{
		Committee: {
			ID: String,
			EN: String,
			CH: String,
			En_Url: String,
			Ch_Url: String
		}
	},
	Status: String,
	End_Time: String,
	EngMeetType: String,
	ChiMeetType: String,
	Show_StartTime: String,
	Show_EndTime: String
});
scheduleSchema.index({ID: 1}, {unique: true});
var Schedule = mongoose.model('Calendar_Schedule', scheduleSchema);

/**
 * Schedule of legco
 * @param  {[type]} req   [description]
 * @param  {[type]} res   [description]
 * @param  {[type]} next) {	res.json({		todo: "Schedule of council"	});} [description]
 * @return {[type]}       [description]
 */
router.get('/schedule', function(req, res, next) {
	// Retrieve the schedule
	var schedules = Schedule.find({}).sort({DateTime:'asc'}).exec(function(err, schedules){
		if(err){
			res.send({
				message: 'Error exists - ' + err.message
			});
		}else{
			res.json(schedules);
		}
	});
});

/**
 * Update the schedule list from legco
 * @param  {[type]} req       [description]
 * @param  {[type]} res       [description]
 * @param  {[type]} next){} [description]
 * @return {[type]}           [description]
 */
router.get('/schedule/update', function(req, res, next){
	request(config.calendar.schedule.update, function(error, response, body){
		if(!error && response.statusCode == 200){
			parser.parseString(body, function(err, result){
				if(err) console.log(err);
				if(typeof result.GetDetailScheduleForWebSiteResponse.LESS[0].DetailSchedule != "undefined"){
					var schedules = result.GetDetailScheduleForWebSiteResponse.LESS[0].DetailSchedule;
					for(var i = 0 ; i < schedules.length; i++){
						var schedule = schedules[i];
						var _schedule = {
							RstStatus: schedule.RstStatus[0],
							ID: schedule.ID[0],
							Date: schedule.Date[0],
							Time: schedule.Time[0],
							Venue_Code: schedule.Venue_Code[0],
							Venue: {
								ID: schedule.Venue[0].ID[0],
								EN: schedule.Venue[0].EN[0],
								CH: schedule.Venue[0].CH[0],
								Site: schedule.Venue[0].Site[0],
								EngLoc: schedule.Venue[0].EngLoc[0],
								ChiLoc: schedule.Venue[0].ChiLoc[0]
							},
							Subject: {
								EN: schedule.Subject[0].EN[0],
								CH: schedule.Subject[0].CH[0]
							},
							Agenda_Path:{
								En_Url: schedule.Agenda_Path[0].En_Url[0],
								Ch_Url: schedule.Agenda_Path[0].Ch_Url[0]
							},
							Committees:{
								Committee: {
									ID: schedule.Committees[0].Committee[0].ID[0],
									EN: schedule.Committees[0].Committee[0].EN[0],
									CH: schedule.Committees[0].Committee[0].CH[0],
									En_Url: schedule.Committees[0].Committee[0].En_Url[0],
									Ch_Url: schedule.Committees[0].Committee[0].Ch_Url[0]
								}
							},
							Status: schedule.Status[0],
							End_Time: schedule.End_Time[0],
							EngMeetType: schedule.EngMeetType[0],
							ChiMeetType: schedule.ChiMeetType[0],
							Show_StartTime: schedule.Show_StartTime[0],
							Show_EndTime: schedule.Show_EndTime[0]
						};
						_schedule.DateTime = moment(_schedule.Date + ' ' + _schedule.Time).toISOString();
						Schedule.findOneAndUpdate({
							ID: _schedule.ID
						}, _schedule, {
							upsert: true
						}, function(e, doc){
							console.log(e);
						});
					}
				}
				res.send({status: 'Success'});
			});
		}else{
			console.log('Error in fetching the schedule');
			console.log('Status Code : ' + response.statusCode);
			console.log('Error : ' + error);
			res.json({
				message: 'Error in fetching the schedule',
				status_code: response.statusCode,
				error: error
			});
		}
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
