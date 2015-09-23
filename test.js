var CLIENT=require('./lib/client.js')

var options={
	clients:2,
	name_patterns:[]
};

var client=new CLIENT(options);





var request = require('request')
// var options={};
var _ = require('lodash');

setTimeout(function(){

	// var kazi = new KAZI(options,false,start);
	// start();

	client.start();

},2000)


var jobs=[]

//add JOb
jobs.push(
	{		
		id:'categoright:getTitles:1',
		name:'categoright',		
		data:{
			method:'getTitles'
		},
		meta:{
			ttl: (10*1000*60), //10 mins
			delay:30,
			priority:'normal',
			terminateAfter:90000
		}
	}
);



jobs.push(
	{
		priority:'normal',
		id:'categoright:getTitles:2',
		name:'categoright',
		ttl: (30*1000*60), //30 mins
		terminateAfter: (10*1000*60), //10 mins
		delay:60,

	}
)

jobs.push(
	{
		priority:'high',
		id:'categoright:getTitles:3',
		name:'categoright',
		ttl: (30*1000*60), //30 mins
		terminateAfter: (10*1000*60), //10 mins
		delay:60,

	}
)




function start(){

	var post={
			url:'http://localhost:2016/jobs/queueJobs', 
			form: {jobs:jobs},
			headers:{
				"kazi-token":"fapi763500("
			}
	}

	// console.log(JSON.stringify(post,0,4));


	// return requestJob();

	// // //first register client
	request.post(post, function(err,httpResponse,body){ 

		var json=JSON.parse(body);
		console.log(JSON.stringify(json,0,4));
		
		// requestJob();

	});

}


function requestJob(){
	// var patterns={name_patterns: ['categoright%']};

	console.log('requesting Job')

	var post={
			url:'http://localhost:2016/jobs/requestJob', 
			// form: jobs,
			// form:patterns,
			headers:{
				"kazi-token":"fapi763500("
			}
	}

	// console.log(JSON.stringify(post,0,4))

	// // //first register client
	request.post(post, function(err,httpResponse,body){ 

		var job=JSON.parse(body);
		

		if(_.size(job)===0){
			//recheck
			setTimeout(requestJob,2000);
		
			
		}
		else{
			console.log(job)

			setTimeout(function(){
				console.log('Finishing Job....')

				finishJob(job);

			}, 3000 )
		}
				
	});
}


function finishJob(jobs){

	var jobs={
		jobs:jobs
	}

	var post={
			url:'http://localhost:2016/jobs/finishJobs', 
			// form: jobs,
			form:jobs,
			headers:{
				"kazi-token":"fapi763500("
			}
	}

	// console.log(JSON.stringify(post,0,4))

	// // //first register client
	request.post(post, function(err,httpResponse,body){ 

		// console.log('ssss');
		// console.log(body);

		//request new job
		console.log("Finished. Requesting New Job");

		requestJob();

	});
}


function rescheduleJobs(jobs){

	var jobs={
		jobs:jobs
	}

	var post={
			url:'http://localhost:2016/jobs/rescheduleJobs', 
			// form: jobs,
			form:jobs,
			headers:{
				"kazi-token":"fapi763500("
			}
	}

	// console.log(JSON.stringify(post,0,4))

	// // //first register client
	request.post(post, function(err,httpResponse,body){ 

		// console.log('ssss');
		// console.log(body);

		//request new job
		console.log("Finished. Requesting New Job");

		requestJob();

	});
}