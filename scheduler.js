var request=require('request');
var path = require('path');
var config= require(path.join(__dirname,'bin','config.json'));
var util = require('util');

//jobs array
var jobs=[]

//add jobs
// jobs.push(
// 	{		
// 		id:'Tracking:Kenya',
// 		name:'twitter-tracker',		
// 		data:{
// 			query:'Kenya OR Kenia'
// 		},
// 		meta:{
// 			ttl: (1*1000*60), //this job, irrespective of its state is killed after 10 minutes. Killing is graceful and only happens when a job is not runnibg (idle) or has completed
// 			delay:20, //how long should we wait before running job
// 			priority:'normal', //whats the job priority (defaults to 'low', 'normal' & 'high' )
// 			reschedule_after:(10*1000*60) //this value forces a job to complete after 90 seconds. This is different from ttl which 'KILLS' the job. With completion, it is assumed that the worker hang or crushed and it is important to keep the job for another worker. KILL on the other hand means the job is never run by any other worker. 'rescheduleAfter' is actually a safeguard to ensure that if a worker hasn't returned a job status for too ling, then the server can automatically reschedule the job and allocate to any other free workers. Because a job can only be served to one client at a time, without this value, hang-up jobs would never get executed!
// 		}
// 	}
// );


//NOTE: all values passed in the meta attribute above can also be passed within the main job object
jobs.push(
	{
		priority:'high',
		id:'Tracking:Museveni',
		name:'tracking.twitter.track',
		data:{
			job_id:'Tracking:Museveni',
			locale: 'ke',
			terms : ['museveni'],
			platforms: ['twitter'],
		},
		ttl: 0, // (3*60*1000*60), //3hours
		reschedule_after: (20*1000*60), //20 mins
		reschedule_after: (10*1000*60), //10 mins
		delay:0 //execute immediately

	}
);


//we are posting jobs and every call to the server must also contain client.name
var payload={
	client:{ "name": "job-creator" },
	jobs:jobs
};

//Compose post with jobs + client payload
var post={
	url: util.format('http://%s:%s/jobs/queueJobs',config.options.host,config.options.port), 
	form: payload,
	//include authentication headers from the config
	headers:config.auth
}

//Now Post JOB
request.post(post, function(err,httpResponse,body){ 

	var JSON_response=JSON.parse(body);

	console.log(JSON.stringify(JSON_response,0,4));

});