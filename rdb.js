var colors = require('colors'),
	dateformat = require('dateformat'),
	http = require('http'),
	optimist = require('optimist'),
	os = require('os'),
	querystring = require('querystring'),
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
	host_ip, hosts;
	
hosts = os.networkInterfaces();
if (hosts[argv.adapter]) {
	console.error("Using adapter " + (argv.adapter + "").green);
	hosts[argv.adapter].forEach(function (element) {
		if (element.family === "IPv4") {
			host_ip = element.address;
		}
	});
} else if (hosts.lo) {
	console.error("Using adapter " + "lo".green);
	hosts.lo.forEach(function (element) {
		if (element.family === "IPv4") {
			host_ip = element.address;
		}
	});
}
	
if (argv.help) {
	console.error("Usage: node ./rdb.js [-p|--port port_number] [-a|--adapter adapter_interface] [-s|--script]\n".yellow);
	console.error("Options:".yellow);
	console.error("\t-p, --port\t\tSelect which port to listen on (Default 8080).".yellow);
	console.error("\t-a, --adapter\t\tSelect which network adapter to listen on (Default lo).".yellow);
	console.error("\t-s, --script\t\tPrints a code snippet to paste into remote apps to feed messages to rdb.".yellow);
	process.exit(0);
} else if (argv.script) {
	console.error("Script snippet:\n===== >8 CUT 8< =====\n".green +"//	Override console.log for remote debugging with rdb.js\n\
console.log = function (data) {\n\
  var message = {};\n\
  if (typeof(data) === 'object') {\n\
    message = data;\n\
  } else {\n\
    message.text = data;\n\
  }\n\
  $.post('http://" + host_ip + ":" + argv.port + "/log', message);\n\
};\n".white + "===== >8 CUT 8< =====\n".green);
}

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
			var fixedData = querystring.parse(data.join(""));
			console.log((req.connection.remoteAddress + " ").uri + timestamp().timestamp + " " + util.inspect(fixedData).message);
		});
		res.writeHead(200);
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
