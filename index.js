var https = require('https');
var request = require('request');
var roomId    = process.env.ROOM_ID || config.ROOM_ID;
var token     = process.env.TOKEN || config.TOKEN;
var emptyMessage = " \n";

// To bind a port on heroku 
https.createServer(function (request, response) {
  console.log("listening on port "+(process.env.PORT || 8080));
}).listen(process.env.PORT || 8080);
  
// Setting the options variable to use it in the https request block
var options = {
  hostname: 'stream.gitter.im',
  port:     443,
  path:     '/v1/rooms/' + roomId + '/chatMessages',
  method:   'GET',
  headers:  {'Authorization': 'Bearer ' + token}
};

// making a request to gitter stream API
var req = https.request(options, function(res) {
  res.on('data', function(chunk) {
    var msg = chunk.toString();
    if(msg != emptyMessage){
      var jsonMsg = JSON.parse(msg);
       if(jsonMsg.fromUser.displayName != 'SusiAI'){
        // The message sent to Susi AI gitter room by the client.

        var clientMsg = jsonMsg.text;
        var ans = '';
        // To set options for a request to Susi with the client message as a query
        var susiOptions = { 
          method: 'GET',
          url: 'http://api.susi.ai/susi/chat.json',
          qs: {  q: clientMsg }
        };

        // A request to the Susi AI API
        request(susiOptions, function (error1, response1, body1) {
          if (error1) 
            throw new Error(error1);

          data = JSON.parse(body1);
          // fetching the answer from Susi's response
          if(data.answers[0].actions[1]){
						if(data.answers[0].actions[1].type === 'rss'){
							ans += 'I found this on the web-:\n\n'
							for(var i=0;i<((data.answers[0].metadata.count)>5?5:data.answers[0].metadata.count);i++){
								ans += ('Title : ');
								ans += data.answers[0].data[i].title+', ';
								ans += ('Link : ');
								ans += data.answers[0].data[i].link+', ';
								ans += '\n\n';
							}
						}
					}
					else{
						if(data.answers[0].actions[0].type === 'table'){
							var colNames = data.answers[0].actions[0].columns;
              ans += 'Due to message limit, only some results are shown-:\n\n';
							for(var i=0;i<((data.answers[0].metadata.count)>5?5:data.answers[0].metadata.count);i++){
								for(var cN in colNames){
									ans += (colNames[cN]+' : ');
									ans += data.answers[0].data[i][cN]+', ';
								}
								ans += '\n\n';
							}
						}
						else
						{
							ans = data.answers[0].actions[0].expression;
						}
					}

          // To set options to send a message i.e. the reply by Susi AI to client's message, to Gitter 
          var gitterOptions = { 
                                method: 'POST',
                                url: 'https://api.gitter.im/v1/rooms/'+roomId+'/chatMessages',
                                headers: 
                                {
                                  'authorization': 'Bearer '+ token ,
                                  'content-type': 'application/json',
                                  'accept': 'application/json'
                                },
                                body: 
                                {
                                  text: ans 
                                },
                                json: true 
                              };

          // making the request to Gitter API
          request(gitterOptions, function (error, response, body) {
            if(error)
              throw new Error(error);
            console.log(body);
          });
        });   
      } 
    } 
  });
});

req.on('error', function(e) {
  console.log('Hey something went wrong: ' + e.message);
});

req.end();
