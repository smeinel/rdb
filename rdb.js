var colors = require('colors'),
	dateformat = require('dateformat'),
	http = require('http')
	querystring = require('querystring'),
	url = require('url'),
	util = require('util');

colors.setTheme({
	uri:		'green',
	timestamp:	'grey',
	message:	'white'
});

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
}).listen(8080);

console.log("Listening on port " + (8080 + "").uri);
