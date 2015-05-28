RDB: Remote DeBugger
=====
RDB is a tool intended for remotely debugging web apps. It's very useful in the case of a device that doesn't have good logging support, or in cases where you'd want to get debug info from another user's usage of your web apps.

Here's an example of RDB in action logging an object:

    $ node rdb.js -a eth0 -s
    Script snippet:
    ===== >8 CUT 8< =====
    //    Override console.log for remote debugging with rdb.js
    function post(url, data) {
      var httpRequest = new XMLHttpRequest();
      
      httpRequest.open('POST', url);
      httpRequest.send(JSON.stringify(data));
    }

    function rdb_console (data) {
      var args = Array.prototype.slice.call(arguments, 0);
      var message = {};
      if (args.length > 1) {
        message.data = JSON.stringify(args);
      } else if ((args.length == 1) && (typeof(data) === 'object')) {
        message.data = JSON.stringify(data);
      } else {
        message.text = data;
      }
      post('http://192.168.1.1:8080/log', message);
    };
    console.log = rdb_console;
    console.info = rdb_console;
    console.debug = rdb_console;
    console.error = rdb_console;
    ===== >8 CUT 8< =====    
    Listening on http://192.168.1.1:8080
    192.168.1.166 20120118 09:41:34 Animation could not be found. Using slideleft.
    192.168.1.166 20120118 09:41:47 Animation could not be found. Using slideleft.
    192.168.1.166 20120118 09:44:55 Animation could not be found. Using slideleft.
    192.168.1.166 20120118 09:44:56 Animation could not be found. Using slideleft.
    192.168.1.166 20120118 09:45:00 Animation could not be found. Using slideleft.
    192.168.1.166 20120118 09:45:04 {
      "copper_patch_panels": [],
      "power_injectors": [],
      "modified_by": "ipaduser",
      "switches": [],
      "created_at": "Tue Jan 10 14:22:33 2012",
      "modified_at": "Tue Jan 10 14:22:33 2012",
      "created_by": "ipaduser",
      "rack_type_id": 1,
      "closet_id": 15,
      "telco_patch_panels": [],
      "rack_type": {
        "modified_by": "testuser",
        "created_at": "Fri Oct  7 13:39:54 2011",
        "modified_at": "Fri Oct  7 13:39:54 2011",
        "created_by": "testuser",
        "height": "80\"",
        "rack_type_id": 1,
        "width": "24\"",
        "depth": "24\"",
        "type": "2 Post"
      },
      "rack_id": 14
    }


Basic Usage
-----
    node rdb.js [-p|--port port_number] [-a|--adapter adapter_interface] [-s|--script]
    
    Options:
    	-p, --port		Select which port to listen on (Default 8080).
    	-a, --adapter		Select which network adapter to listen on (Default lo (lo0 on OS X)).
    	-s, --script		Prints a code snippet to paste into remote apps to feed messages to rdb.

To listen on localhost, port 8080, all you'd have to invoke is:
`node rdb.js`

Invoking `node rdb.js -s` will output a snippet to paste into your web page's JavaScript in order to route console.log, console.info, console.debug, and console.error calls to RDB.

    //    Override console.log for remote debugging with rdb.js
    function post(url, data) {
      var httpRequest = new XMLHttpRequest();
      
      httpRequest.open('POST', url);
      httpRequest.send(JSON.stringify(data));
    }

    function rdb_console (data) {
      var args = Array.prototype.slice.call(arguments, 0);
      var message = {};
      if (args.length > 1) {
        message.data = JSON.stringify(args);
      } else if ((args.length == 1) && (typeof(data) === 'object')) {
        message.data = JSON.stringify(data);
      } else {
        message.text = data;
      }
      post('http://127.0.0.1:8080/log', message);
    };
    console.log = rdb_console;
    console.info = rdb_console;
    console.debug = rdb_console;
    console.error = rdb_console;

The snippet will be customized depending on what port and adapter you specified when calling the app.

Installation
-----
RDB follows standard Node.js & NPM standards for managing dependencies. Once you check out the RDB code, you'll simply link the needed libraries with NPM.

    git clone git@github.com:smeinel/rdb.git
    cd rdb
    npm install


That's it. Now you're ready to run RDB.
