'use strict';

const express = require('express');
var bodyParser = require('body-parser');
var request = require('request');
var fs = require('fs');
var shell = require('shelljs');
var yaml = require('js-yaml');
var _ = require('underscore');

// Init
var DEBUG;
const DB_HOST = process.env.DB_NAME;
const PORT = 8080;
var BOT, TOKEN;

// Command line arguments
DEBUG = process.env.DEBUG === 'true' ? true : false;

// Load config and choose the correct bot
// Get document, or throw exception on error
try {
  var doc = yaml.safeLoad(fs.readFileSync('./credentials.yaml', 'utf8'));
  var matches = yaml.safeLoad(fs.readFileSync('./matches.yaml', 'utf8'));
} catch (e) {
  console.log(e);
  process.exit(1);
}

// Choose which credentials to use
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
  // Make a copy of the incoming message body
  const body = Object.assign({}, req.body);

  // SAMPLE BODY
  // body: {
  //   "attachments":  [],
  //   "avatar_url":   "https://i.groupme.com/750x436.jpeg.1f104b1d544e41c89d1bb",
  //   "created_at":   1516745932,
  //   "group_id":     "13896308",
  //   "id":           "157774595555563188",
  //   "name":         "Display name",
  //   "sender_id":    "12345678",
  //   "sender_type":  "user",
  //   "source_guid":  "cdc0d76ac8db7777777e4bae1601be5c",
  //   "system":       false,
  //   "text":         "text sent",
  //   "user_id":      "12345678"
  // }

  var userID = 'all';

  // Check each key in matches.yaml
  for (var key in matches) {
    // Set userID if the sender matches a key
    userID = body['sender_id'] === key ? body['sender_id'] : 'all';

    // If userID != all, then we found a key match, so break out
    if (userID !== 'all') {
      break;
    }
  }

  var reply = '';
  var re = null;

  // Check 'match' value in matches.yaml for given user
  matches[userID].forEach(function(obj, i) {
    re = new RegExp(obj['match']);

    // Check if we find a regex match on a 'match' value
    if (re.exec(body['text'].toLowerCase()) != null) {
      // Match was found, choose a random reply
      reply = _.sample(obj['replies']);
    }

    // Should add a break here at some point
    // to avoid unnecessary loops
  });

  // Depending on the value of reply, there are different actions to take
  switch (reply) {
    case '':
      // Do nothing
      break;
    case 'image':
      // Submit photo to groupme photo service and get the image URL back
      var cmd = "curl -s 'https://image.groupme.com/pictures' -X POST -H 'X-Access-Token: " + TOKEN + "' -H 'Content-Type: image/jpeg' --data-binary @./photos/`ls photos | shuf -n 1`";
      console.log('cmd: ', cmd);

      var response = shell.exec(cmd).stdout;
      var img_url = JSON.parse(response).payload.url;

      postMsg({'picture_url': img_url});
      break;
    default:
      // Post a text reply
      postMsg({ 'text': reply });
      break;
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
    console.log('error:', error);
    console.log('statusCode:', response && response.statusCode);
    console.log('body:', body);
  });
}

app.listen(PORT);
console.log('Running on http://localhost:' + PORT);
