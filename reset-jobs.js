var request=require('request');
var path = require('path');
var config= require(path.join(__dirname,'bin','config.json'));
var util = require('util');



//we are posting jobs and every call to the server must also contain client.name
var payload={
	client:{ "name": "job-creator" },
	jobs:['Tracking:US','anotherJobId','Tracking:Kenya'] //array of the ids of jobs to kill
};

//Compose post with jobs + client payload
var post={
	url: util.format('http://%s:%s/jobs/resetJobs',config.options.host,config.options.port), 
	form: payload,
	//include authentication headers from the config
	headers:config.auth
}


//Now Post JOB
request.post(post, function(err,httpResponse,body){ 

	var JSON_response=JSON.parse(body);

	console.log(JSON.stringify(JSON_response,0,4));

});