//load kazi-client
var CLIENT=require('./lib/client.js');
var path = require('path');

//a few options (see-complete options list)
var options={
	"clients": 4 , //number of instances to run defaults to number of cpus
	"name_patterns":[], //type of jobs to run. This value can be a pattern. A blank array means all job names

	"workers_dir": path.join(__dirname, '..', '..' , 'WORKERS'), //where your workers are stored
	// "safe_job_rescue":true, // should we try to rescue job if worker encounters an era. Avoids jobs hanging in active state as happens with many other job queues
	"waitBeforeRequest": (10*1000), //how long should we wait before requesting for another job if the server responds with a blank nobject (if there are NO JOBS)
	// "logsPath": path.join(__dirname,'..','logs') //Where should we physically save our error logs

};

//initialize client/runner
var client=new CLIENT(options);

//start client/runner
client.start();

