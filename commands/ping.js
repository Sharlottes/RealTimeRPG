const tcpp = require('tcp-ping');
const fs = require('fs');
const request = require('request');



exports.run = (client, message, args) => {
    request ({
	    url: 'https://raw.githubusercontent.com/Anuken/Mindustry/master/servers_v7.json',
	    json: true
    }, (error, response, body) => !error && response.statusCode === 200 ? JSON.parse(JSON.stringify(body), (k, v) => {
        console.log(k + " - " + v);
        return v;
    }) : console.log(error))
    message.channel.send("ps: server is on us");
    message.reply(`${client.ws.ping}ms`);
    if(args[0] !== undefined) {
        let started = new Date().getTime();
        tcpp.probe(args[0], args[1] === undefined ? 6567 : args[1], (err, available) => message.channel.send(`${args[0]}, ${new Date().getTime() - started}ms`));
    }
}

exports.name = 'ping';
exports.description = 'check bot status';