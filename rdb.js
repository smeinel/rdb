var colors = require('colors'),
	dateformat = require('dateformat'),
	http = require('http'),
	optimist = require('optimist'),
	os = require('os'),
	Q = require('q'),
	querystring = require('querystring'),
	sqlite3 = require('sqlite3'),
	url = require('url'),
	util = require('util');

colors.setTheme({
	uri:		'green',
	timestamp:	'grey',
	message:	'white'
});

var argv = optimist.options('port', {
		alias: 'p',
		default: 8080
	}).options('adapter', {
		alias: 'a',
		default: 'lo'
	}).alias('script', 's').argv,
	database, host_ip, hosts;

function checkHelp() {
	return Q.Promise(function(resolve, reject) {
		if (argv.help) {
			console.error("Usage: node rdb.js [-p|--port port_number] [-a|--adapter adapter_interface] [-s|--script]\n".yellow);
			console.error("Options:".yellow);
			console.error("\t-p, --port\t\tSelect which port to listen on (Default 8080).".yellow);
			console.error("\t-a, --adapter\t\tSelect which network adapter to listen on (Default lo (lo0 on OS X)).".yellow);
			console.error("\t-s, --script\t\tPrints a code snippet to paste into remote apps to feed messages to rdb.".yellow);
			process.exit(0);
		}
		return resolve(false);
	});
}

function getInterface() {
	return Q.Promise(function(resolve, reject) {
		//	Get the host IP from the selected interface
		hosts = os.networkInterfaces();
		//	OS X defaults to lo0 for the loopback interface rather than lo
		if (argv.adapter === "lo" && os.platform() === "darwin") {
			argv.adapter = "lo0";
		}
		if (hosts[argv.adapter]) {
			hosts[argv.adapter].forEach(function (element) {
				if (element.family === "IPv4") {
					host_ip = element.address;
					return resolve(host_ip);
				}
			});
		} else {
			console.error(("Adapter " + argv.adapter + " not found. Available adapters:").red);
			console.error(hosts);
			process.exit(1);
		}
	});
}

function showScript() {
	//	Output the script?
	if (argv.script) {
		console.error("Script snippet:\n===== >8 CUT 8< =====\n".green + ("//	Override console.log for remote debugging with rdb.js\n\
	function post(url, data) {\n\
	  var httpRequest = new XMLHttpRequest();\n\
	  \n\
	  httpRequest.open('POST', url);\n\
	  httpRequest.send(JSON.stringify(data));\n\
	}\n\
	\n\
	function rdb_console (data) {\n\
	  var args = Array.prototype.slice.call(arguments, 0);\n\
	  var message = {};\n\
	  if (args.length > 1) {\n\
	    message.data = JSON.stringify(args);\n\
	  } else if ((args.length == 1) && (typeof(data) === 'object')) {\n\
	    message.data = JSON.stringify(data);\n\
	  } else {\n\
	    message.text = data;\n\
	  }\n\
	  post('http://" + host_ip + ":" + argv.port + "/log', message);\n\
	};\n\
	console.log = rdb_console;\n\
	console.info = rdb_console;\n\
	console.debug = rdb_console;\n\
	console.error = rdb_console;\n").white.bold + "===== >8 CUT 8< =====\n".green);
	}
}

function createDB() {
	return Q.Promise(function(resolve, reject) {
		database = new sqlite3.Database('rdb.sqlite3', function(err) {
			if (err) {
				console.error(err);
				pocess.exit(1);
			}
			return resolve(database);
		});
	});
}

function startServer() {
	http.createServer(function (req, res) {
		var url_parts = url.parse(req.url, true);
		
		switch (url_parts.pathname) {
			case '/log':
				logMessage(req, res);
				break;
			default:
				message404(url_parts.pathname, req, res);
		}
		
		function logMessage (req, res) {
			var data = [];
			req.on('data', function (chunk) {
				data.push(chunk);
			});
			req.on('end', function () {
				var fixedData = JSON.parse(data.join(""));
				if (fixedData['data']) {
					console.log((req.connection.remoteAddress + " ").uri + timestamp().timestamp + " " + fixedData.uuid + " (" + fixedData.now + ") " + JSON.stringify(JSON.parse(fixedData['data']), null, "  ").message);
				} else {
					console.log((req.connection.remoteAddress + " ").uri + timestamp().timestamp + " " + fixedData.uuid + " (" + fixedData.now + ") " + fixedData.text.message);
				}
			});
			res.writeHead(200, {
				'Access-Control-Allow-Origin': '*',
		    'Access-Control-Allow-Headers': 'X-Requested-With'
			});
			res.end();
		}
		
		function message404 (pathname, req, res) {
			console.log((req.connection.remoteAddress + " ").uri + timestamp().timestamp + " 404".red + (" " + pathname).message);
			res.writeHead(404, {'Content-Type': 'text/html'});
			res.end("<h1>404 Not Found</h1>The page <em>" + pathname + "</em> was not found.");
		}
		
		function timestamp () {
			var now = Date();
			return dateformat(now, "yyyymmdd HH:MM:ss");
		}
	}).listen(argv.port, host_ip);

	console.log("Listening on " + ("http://" + host_ip + ":" + argv.port).uri);
}

checkHelp()
	.then(getInterface)
	.then(showScript)
	.then(createDB)
	.then(startServer)
	.catch(function(err) {
		console.error('ERROR: ' + err);
		process.exit(1);
	});
