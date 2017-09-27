'use strict';

const express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var fs = require('fs');
var shell = require('shelljs');
var yaml = require('js-yaml')

// Init
const DEBUG = false;
const DB_HOST = process.env.DB_NAME;
const PORT = 8080;
var BOT, TOKEN;

// Load config and choose the correct bot
// Get document, or throw exception on error
try {
  var doc = yaml.safeLoad(fs.readFileSync('./credentials.yaml', 'utf8'));
} catch (e) {
  console.log(e);
  process.exit(1);
}

BOT = DEBUG == true ? doc.bots[0] : doc.bots[1];
TOKEN = doc.access_token;

// Build the base request for sending messages
var msg_options = {
  url: 'https://api.groupme.com/v3/bots/post?token=' + TOKEN,
  method: 'POST',
  headers: {
    'User-Agent': 'Super Agent/0.0.1',
    'Content-Type': 'application/x-www-form-urlencoded'
  }
};

// Express
const app = express();
app.use(bodyParser.json());

app.post('/groupme', function (req, res) {
  // Log incoming request body from chat post
  console.log('body: ' + JSON.stringify(req.body));

  // Log every message into InfluxDB
  var sender_id = req.body['sender_id'];
  var sender_name = req.body['name'];
  var cmd = "curl -i -XPOST 'http://" + DB_HOST + ":8086/write?db=mydb' --data-binary \"post,sender_id=" + sender_id + " value=1 `date +%s`000000000\"";
  shell.exec(cmd).stdout;

  // Clean the incoming message stringify
  var text = req.body['text'].trim().toUpperCase();

  // Match any string containing 'macbot'
  if (text.indexOf('MACBOT') !== -1 && req.body['sender_id'] === '27041193') {
    var cmd = "curl -s 'https://image.groupme.com/pictures' -X POST -H 'X-Access-Token: " + TOKEN + "' -H 'Content-Type: image/jpeg' --data-binary @./photos/macbot-tyler.png";
    var response = shell.exec(cmd).stdout;
    var img_url = JSON.parse(response).payload.url;
    console.log('img_url: ' + img_url);
    
    postMsg({'picture_url': img_url});

  } else if (text.indexOf('MACBOT') !== -1 || text.indexOf('MACB0T') !== -1) {
    // Submit photo to groupme photo service and get the image URL back
    var cmd = "curl -s 'https://image.groupme.com/pictures' -X POST -H 'X-Access-Token: " + TOKEN + "' -H 'Content-Type: image/jpeg' --data-binary @./photos/`ls photos | shuf -n 1`";
    var response = shell.exec(cmd).stdout;
    var img_url = JSON.parse(response).payload.url;
    console.log('img_url: ' + img_url);

    postMsg({'picture_url': img_url});

  } else if ((text.indexOf('^STUPID') !== -1 || text.indexOf('^ STUPID') !== -1) && req.body['sender_id'] === '27041248') {
    postMsg({'text': '^stupid'});
  } else if (text.indexOf('^') !== -1 && req.body['sender_id'] === '27041248') {
    postMsg({'text': req.body['text']});
  }
});

function postMsg(options) {
  var defaults = { 'bot_id': BOT.bot_id, 'group_id': BOT.group_id };

  if (options.text) {
    defaults.text = options.text;
  }

  if (options.picture_url) {
    defaults.picture_url = options.picture_url;
  }

  msg_options.form = defaults;

  request(msg_options, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log(JSON.stringify('body: ' + body));
      console.log(JSON.stringify('response: ' + response));
    } else {
      console.log('error: ' + error);
    }
  });
}

app.listen(PORT);
console.log('Running on http://localhost:' + PORT);
