const Discord = require('discord.js'); 


function ping(host, port) {
    var started = new Date().getTime();
    var http = new XMLHttpRequest();
  
    http.open("GET", "http://" + host + ":" + port, /*async*/true);
    http.onreadystatechange = () => {
      if (http.readyState == 4) 
        message.reply(`${new Date().getTime() - started}ms`);
    };
    try {
      http.send(null);
    } catch(exception) {
      // this is expected
    }
}

exports.run = (client, message, args) => {
    message.reply(`${client.ws.ping}ms`);
    message.reply("pong!");
    if(args[0] !== undefined) {
        if(args[1] !== undefined) ping(args[0], args[1]);
        else ping(args[0], args[1]);
    };
};

exports.name = 'ping';
exports.description = 'check bot status';