var SummaryTool = require('node-summary');

// Require the 'ac-koa' module, and then tell it to load the 'hipchat' adapter
// from 'ac-koa-hipchat'
var ack = require('ac-koa').require('hipchat');
// Require our package.json file, which doubles as the configuration from which
// we'll generate the add-on descriptor and server's runtime parameters
var pkg = require('./package.json');
// Create the base Koa app, via an 'ac-koa' factory method that helps preconfigure
// and decorate the app object
var app = ack(pkg);

// Now build and mount an AC add-on on the Koa app; we can either pass a full or
// partial descriptor object to the 'addon()' method, or when we provide none, as
// in this example, we can instead create the descriptor using a product-specific
// builder API
var addon = app.addon()
  // Use the hipchat descriptor builder
  .hipchat()
  // Indicate that the descriptor should mark this as installable in rooms
  .allowRoom(true)
  // Provide the list of permissions scopes the add-on requires
  .scopes('send_notification');

var toPrint = addon.webhook;

// Subscribe to the 'room_enter' webhook, and provide an event listener.  Under
// the covers, this adds a webhook entry to the add-on descriptor, mounts a common
// webhook endpoint on the Koa app, and brokers webhook POST requests to the event
// listener as appropriate
addon.webhook('room_message', /^\/tldr\s+[\s\S]*$/ ,function () {
  // 'this' is a Koa context object, containing standard Koa request and response
  // contextual information as well as hipchat-specific models and services that
  // make handling the webhook as simple as possible
  
  var self = this;

  var title = ''; // TODO: extract first sentence as title ?
  var message = this.request.body.item.message.message
  var content = message.substring(6,message.length);

  SummaryTool.summarize(title, content, function (err, summary) {

      if(err){
        console.log("ERROR",err);
      }

      var output = '';
      var stats = '';
      output += summary+'\n';

      /*output += '<Original Length ' + (title.length + content.length) + '\n';
      output += 'Summary Length ' + summary.length + '\n';
      output += 'Summary Ratio: ' + (100 - (100 * (summary.length / (title.length + content.length)))) + '-->\n';*/

      stats += "Original Length: " + (title.length + content.length);
      stats += " || Summary Length: " + summary.length;
      stats += " || Summary Ratio: " + (100 - (100 * (summary.length / (title.length + content.length)))).toFixed(2) + "%";

      self.roomClient.sendNotification(output);

      self.roomClient.sendNotification(stats);

      return 0;
  });
  
});

// Now that the descriptor has been defined along with a useful webhook handler,
// start the server 
app.listen();
