const tcpp = require('tcp-ping');
const request = require('request');
let server = [{
    name: "",
    address: ""
}]
let serverIndex = 0;
exports.run = (client, message, args) => {
    request ({
	    url: 'https://raw.githubusercontent.com/Anuken/Mindustry/master/servers_v7.json',
	    json: true
    }, (error, response, body) => !error && response.statusCode === 200 ? JSON.parse(JSON.stringify(body), (k, v) => {
        if(k === "name") server[serverIndex].name = v;
        if(k === "address") server[serverIndex].address = v;
        if(server[serverIndex].name != "" && server[serverIndex].address != "") {
            console.log(server);
            serverIndex++; 
            server[serverIndex] = {name: "", address: ""};
        }
        return v;
    }) : console.log(error))
    message.reply(`${client.ws.ping}ms`);
    if(args[0] !== undefined) {
        let started = new Date().getTime();
        tcpp.probe(args[0], args[1] === undefined ? 6567 : args[1], (err, available) => message.channel.send(`${args[0]}, ${new Date().getTime() - started}ms`));
    }
}

exports.name = 'ping';
exports.description = 'check bot status';