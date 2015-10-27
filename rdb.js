var colors = require('colors');
var dateformat = require('dateformat');
var http = require('http');
var optimist = require('optimist');
var os = require('os');
var Q = require('q');
var sqlite3 = require('sqlite3');
var url = require('url');
var argv;
var database;
var hostIP;
var hosts;

colors.setTheme({
  uri:    'green',
  timestamp:  'grey',
  message:  'white',
});

argv = optimist.options('port', {
  alias: 'p',
  default: 8080,
}).options('adapter', {
  alias: 'a',
  default: 'lo',
}).alias('script', 's').argv;

function checkHelp() {
  return Q.Promise(function(resolve) { // eslint-disable-line new-cap
    if (argv.help) {
      console.error(
        'Usage: node rdb.js [-p|--port port_number] [-a|--adapter adapter_interface] [-s|--script]\n'.yellow
      );
      console.error('Options:'.yellow);
      console.error('\t-p, --port\t\tSelect which port to listen on (Default 8080).'.yellow);
      console.error('\t-a, --adapter\t\tSelect which network adapter to listen on (Default lo (lo0 on OS X)).'.yellow);
      console.error(
        '\t-s, --script\t\tPrints a code snippet to paste into remote apps to feed messages to rdb.'.yellow
      );
      process.exit(0);
    }
    return resolve(false);
  });
}

function getInterface() {
  return Q.Promise(function(resolve) { // eslint-disable-line new-cap
    //  Get the host IP from the selected interface
    hosts = os.networkInterfaces();
    //  OS X defaults to lo0 for the loopback interface rather than lo
    if (argv.adapter === 'lo' && os.platform() === 'darwin') {
      argv.adapter = 'lo0';
    }
    if (hosts[argv.adapter]) {
      hosts[argv.adapter].forEach(function(element) {
        if (element.family === 'IPv4') {
          hostIP = element.address;
          return resolve(hostIP);
        }
      });
    } else {
      console.error(('Adapter ' + argv.adapter + ' not found. Available adapters:').red);
      console.error(hosts);
      process.exit(1);
    }
  });
}

function showScript() {
  //  Output the script?
  if (argv.script) {
    console.error('Script snippet:\n===== >8 CUT 8< =====\n'.green);
    console.error('// Override console.log for remote debugging with rdb.js'.white.bold);
    console.error('  function post(url, data) {'.white.bold);
    console.error('    var httpRequest = new XMLHttpRequest();'.white.bold);
    console.error('    '.white.bold);
    console.error('    httpRequest.open(\'POST\', url);'.white.bold);
    console.error('    httpRequest.send(JSON.stringify(data));'.white.bold);
    console.error('  }'.white.bold);
    console.error('  '.white.bold);
    console.error('  function rdb_console (data) {'.white.bold);
    console.error('    var args = Array.prototype.slice.call(arguments, 0);'.white.bold);
    console.error('    var message = {};'.white.bold);
    console.error('    if (args.length > 1) {'.white.bold);
    console.error('      message.data = JSON.stringify(args);'.white.bold);
    console.error('    } else if ((args.length == 1) && (typeof(data) === \'object\')) {'.white.bold);
    console.error('      message.data = JSON.stringify(data);'.white.bold);
    console.error('    } else {'.white.bold);
    console.error('      message.text = data;'.white.bold);
    console.error('    }'.white.bold);
    console.error(('    post(\'http://' + hostIP + ':' + argv.port + '/log\', message);').white.bold);
    console.error('  };'.white.bold);
    console.error('  console.log = rdb_console;'.white.bold);
    console.error('  console.info = rdb_console;'.white.bold);
    console.error('  console.debug = rdb_console;'.white.bold);
    console.error('  console.error = rdb_console;'.white.bold);
    console.error('===== >8 CUT 8< =====\n'.green);
  }
}

function createDB() {
  return Q.Promise(function(resolve) { // eslint-disable-line new-cap
    database = new sqlite3.Database('rdb.sqlite3', function(err) {
      if (err) {
        console.error(err);
        pocess.exit(1);
      }
      return resolve(database);
    });
  });
}

function createTable() {
  return Q.Promise(function(resolve, reject) { // eslint-disable-line new-cap
    var query = 'CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY, timestamp TEXT, address TEXT, '
      + 'uuid TEXT, now INTEGER, data TEXT);';

    database.run(query, function(err) {
      if (err) {
        reject(new Error(err));
      }
      resolve(true);
    });
  });
}

function writeRow(timestamp, address, uuid, now, data) {
  var statement = database.prepare('INSERT INTO messages VALUES (NULL, ?, ?, ?, ?, ?);');

  statement.run(timestamp, address, uuid, now, data);
}

function startServer() {
  http.createServer(function(req, res) {
    var urlParts = url.parse(req.url, true);

    function timestamp() {
      var now = Date();

      return dateformat(now, 'yyyymmdd HH:MM:ss');
    }

    function logMessage(req, res) {
      var data = [];

      req.on('data', function(chunk) {
        data.push(chunk);
      });
      req.on('end', function() {
        var fixedData = JSON.parse(data.join(''));
        var now = fixedData.now;
        var time = timestamp().timestamp;
        var uuid = fixedData.uuid;

        if (fixedData.data) {
          writeRow(time, req.connection.remoteAddress, uuid, now, JSON.stringify(JSON.parse(fixedData.data)));
          console.log(
            (req.connection.remoteAddress + ' ').uri + time + ' ' + uuid + ' (' +
              now + ') ' + JSON.stringify(JSON.parse(fixedData.data), null, '  ').message
          );
        } else {
          writeRow(time, req.connection.remoteAddress, uuid, now, fixedData.text.message);
          console.log(
            (req.connection.remoteAddress + ' ').uri + time + ' ' + uuid + ' (' + now + ') ' + fixedData.text.message
          );
        }
      });
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'X-Requested-With',
      });
      res.end();
    }
    
    function message404(pathname, req, res) {
      console.log(
        (req.connection.remoteAddress + ' ').uri + timestamp().timestamp + ' 404'.red + (' ' + pathname).message
      );
      res.writeHead(404, {'Content-Type': 'text/html'});
      res.end('<h1>404 Not Found</h1>The page <em>' + pathname + '</em> was not found.');
    }
    
    switch (urlParts.pathname) {
      case '/log':
        logMessage(req, res);
        break;
      default:
        message404(urlParts.pathname, req, res);
    }
  }).listen(argv.port, hostIP);

  console.log('Listening on ' + ('http://' + hostIP + ':' + argv.port).uri);
}

checkHelp()
  .then(getInterface)
  .then(showScript)
  .then(createDB)
  .then(createTable)
  .then(startServer)
  .catch(function(err) {
    console.error('ERROR: ' + err);
    process.exit(1);
  });
