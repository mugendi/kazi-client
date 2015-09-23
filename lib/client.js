
var request = require('request');
var _ = require('lodash');
var path = require('path');
var chokidar = require('chokidar');
var cluster = require('cluster');
var async = require('async');
var util = require('util');
var JSONParse = require('json-parse-safe');
var clearRequire = require('clear-require');
var moment = require('moment');
var mkdirp = require('mkdirp');
var chalk = require('chalk');

var Chance = require('chance'),
    chance = new Chance(); 

//domain
var Domain = require('domain');
var config = require( path.join(__dirname,'..','bin','config.json'));

var logger=require('./log.js');
var log={};


var CLIENT={};


function client(options){

	CLIENT=this;

	CLIENT.options=_.extend(
		{
			"clients": require('os').cpus().length,
			"name_patterns" : [],
			"workers_dir": path.join(__dirname,'..','workers'),
			"safe_job_rescue":true,
			"waitBeforeRequest": (5*1000), //20 s,
			"logsPath": path.join(__dirname,'..','logs'),
		},
		options,
		config.options
	);

	//ensure numeric
	CLIENT.options.clients = _.parseInt(CLIENT.options.clients) || require('os').cpus().length;

	/*Domain stuff*/
	CLIENT.domain = Domain.create();
	/*if Domain Error*/
	CLIENT.domain.on('error', CLIENT.error );

	/*AUTH*/
	CLIENT.auth=config.auth || { "kazi-token":"fapi763500(" }

	//make relevant paths
	//1st logs path
	mkdirp.sync(CLIENT.options.logsPath);

	//init log
	log= new logger({ logsPath: CLIENT.options.logsPath })

}



client.prototype={

	error:function(error){

		
		/*If we have an error, we need to quickly reschedule/rescue this job if safe rescue is set*/
		if(CLIENT.options.safe_job_rescue===true){
			// log.info(CLIENT.workers[job.name].current_job, CLIENT.client.name);

			log.info("\nRescuing Job: "+ chalk.red.bold(CLIENT.workers.current_job.id) +"\n", CLIENT.client.name);

			CLIENT.rescheduleJobs( CLIENT.workers.current_job ,function(response){
				// log.info(response)
				// Ok, we have handled our escape. Let's kill this client now
				process.exit(1);
			});

		}

		log.error(error.stack);

		var err=util.inspect(error.stack).replace(/\\n/g,"\n")
										 .replace(/^'|'$/g,'');

		log.firebase(err,'error')
				

		/*
			If we wait for some 60 seconds, we should expect user has handled errors via escape, 
			Too bad if they havent done so coz at this point, we must exit at all cost!
		*/
		var killtimer = setTimeout(function() {
	      process.exit(1);
	    }, 60000);
	},


	go:function(){
		// log.info(CLIENT.options)
		//request for job
		CLIENT.requestJob(function(job){

			if(_.size(job)){

				log.info("Attempting to run Job: "+ chalk.red.bold(job.id) , CLIENT.client.name);
				log.firebase("Attempting to run Job: "+ job.id , 'log', CLIENT.client.name);


				//run dob with right worker
				if(_.has(CLIENT.workers,job.name)){

					//give worker job to run via domains

					CLIENT.domain.run(function() {

						//take NOTE of job 
						CLIENT.workers.current_job=job;
					
						/*PASS LOGGER TOO!!!!!*/
						CLIENT.workers[job.name].run( job , function(jobs){

							//log finish
							log.info("Job: " + chalk.red.bold(job.id) + " Finished!", CLIENT.client.name);
							log.firebase("Job: " + job.id + "Finished!",'log', CLIENT.client.name);


							//reschedule any jobs that may be returned
							if((_.isArray(jobs) && jobs.length>0) || (_.isObject(jobs) && _.size(jobs)>0 )){
								//we have jobs to reschedule
								log.info("Rescheduling Jobs...", CLIENT.client.name);

								log.firebase("Rescheduling Jobs...",'log', CLIENT.client.name);


								CLIENT.rescheduleJobs(jobs,function(response){
									// log.info(response)
									//wait breifly & request new job
									setTimeout( CLIENT.go , 5)
								});

							}
							else{
								//returning a blank is synonymous to sayning current job has ended/completed/terminated
								log.info("Finishing Job: "+ chalk.red.bold(CLIENT.workers.current_job.id) , CLIENT.client.name );

								log.firebase("Finishing Job: "+ CLIENT.workers.current_job.id, 'log' , CLIENT.client.name );


								CLIENT.finishJobs(CLIENT.workers.current_job,function(response){
									// log.info(response)
									//wait breifly & request new job
									setTimeout( CLIENT.go , 5);
								});
							}

						});
				  	});
				}
				else{
					//no workers to run this job, reschedule job and alert
					log.warn("No workers to run this type of job "+ chalk.red.bold(job.name) +" have been loaded!");
					log.firebase("No workers to run this type of job "+job.name+" have been loaded!",'error');
					

					CLIENT.rescheduleJobs(job,function(response){
						// log.info(response)
						//wait breifly & request new job
						setTimeout( CLIENT.go , 5)
					});

				}				
			}
			else{

				//firebase log
				log.firebase('No job served.','log', CLIENT.client.name);

				//wait before next request
				log.info(chalk.gray('Waiting '+ (CLIENT.options.waitBeforeRequest/1000) + ' seconds before next request.'), CLIENT.client.name );

				//delay a while before next restart
				setTimeout( CLIENT.go , CLIENT.options.waitBeforeRequest);

			}
			

		});
	},

	start:function(){

		/*//manage multiple clients via cluster...*/
		if (cluster.isMaster) {
		  // Fork workers.
		  for (var i = 0; i < CLIENT.options.clients; i++) {
		    cluster.fork();
		  }

		  cluster.on('exit', function(worker, code, signal) { 

		    log.info('Oops! Worker ' + worker.process.pid + ' died' );

		    cluster.fork();
		  });

		} else {

			CLIENT.client={
				"name" : chance.first().toUpperCase(),
				"started" : moment().toISOString()
			}

			//start
			log.info( chalk.green.bold('Started & running via Process-ID: '+process.pid) , CLIENT.client.name);

			//load workers
			CLIENT.loadWorkers(function(){
				//start job requests
				CLIENT.go();
			});
			
		}		
	},

	loadWorkers: function(callback){

		CLIENT.worker_files=[];

		var watcher = chokidar.watch(CLIENT.options.workers_dir, {
			//ignore dotfiles, ignore (node_modules|src|lib.*|data|config|dist|code)/*, ignore any other file other than .js
			ignored: /[\/\\]\.|(node_modules|src|lib.*|data|config|dist|code)[\/\\].*|\.(json|txt|sql|log|html?)/,
			persistent: true
		});

		watcher
		  .on('add', function(file_path) {		  	
		  	CLIENT.worker_files.push(file_path);
		  })
		  .on('change', function(file_path) { 

		  	// CLIENT.worker_files.push(file_path);
		  	//if worker has changed, relod directly
		  	CLIENT.requireWorkers([file_path]);

		  })
		  //callback when ready to start
		  .on('ready', function(file_path) { 

		  	// Wrap require function in domain
		  	CLIENT.domain.run(function() {
				CLIENT.requireWorkers(CLIENT.worker_files,callback);
		  	});

		  });
	},

	requireWorkers: function(worker_files,callback){

		callback=callback || function(){}

		CLIENT.workers={};

		//async load each worker safely
		async.eachLimit(worker_files,1,function(file,next){

			//if is JS file
			if(/\.js$/.test(file)){

				try{
					var worker=require(file);
					clearRequire(file);

					// log.info(file)
					//make worker name
					var name=file.replace(CLIENT.options.workers_dir,'')
								 .replace(/\.js$/,'')
								 .replace(/[\/\\]/ig,'.')
								 .replace(/^\./,'');

					log.info(chalk.cyan.bold("Loading worker: " + name ), CLIENT.client.name);

					//ensure worker has a run function
					if(_.has(worker,'run') && _.isFunction(worker.run)){
						// log.info('sghfds')
						CLIENT.workers[name]=worker;
					}

					//clear worker var
					worker=null;

				}
				catch(e){

				}	
			}
			
			next();

		},function(){

			//loaded all
			// log.info(CLIENT.workers);
			//client ready to begin requesting jobs
			callback();

		})
	},

	finishJobs: function(jobs,callback){

		var payload={jobs: jobs };
		CLIENT.post('finishJobs',payload,callback);
	},

	rescheduleJobs: function(jobs, callback){
		var payload={jobs: jobs };
		CLIENT.post('rescheduleJobs',payload,callback);
	},

	requestJob: function(callback){
		//firebase log
		log.firebase("Requesting Job...",'log', CLIENT.client.name);

		var payload={name_patterns: CLIENT.options.name_patterns };
		CLIENT.post('requestJob',payload,callback);		
	},

	post: function(endpoint,payload,callback){

		// log.info(CLIENT.client.name, CLIENT.client.name)
		//always add client info
		//always update client age
		CLIENT.client.uptime= moment.utc(moment().diff(moment(CLIENT.client.birth))).format("HH:mm:ss")+' seconds';

		payload.client=CLIENT.client;
		
		//make post
		var post={
			url:util.format('http://%s:%s/jobs/%s', CLIENT.options.host, CLIENT.options.port, endpoint), 
			form: payload,
			headers:CLIENT.auth
		}

		// log.info(JSON.stringify(post,0,4), CLIENT.client.name)

		request.post(post, function(error,httpResponse,body){


			if(!error && httpResponse.statusCode==200){
				//callbak with valid JSON
				callback(JSONParse(body).value);
			}
			else{
				log.error(error, CLIENT.client.name);
				log.firebase(error,'error', CLIENT.client.name);
			}

		});
	}



}



module.exports=client;
