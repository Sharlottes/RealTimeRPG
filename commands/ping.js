const tcpp = require('tcp-ping');
const request = require('request');
let server = [{
    name: "",
    address: ""
}]
let serverIndex = 0;
exports.run = (client, message, args) => {
    message.reply(`${client.ws.ping}ms`);
    if(args[0] !== undefined) {
        let started = new Date().getTime();
        tcpp.probe(args[0], args[1] === undefined ? 6567 : args[1], (err, available) => message.channel.send(`${args[0]}, ${new Date().getTime() - started}ms`));
        if(args[0] == "be"){
            let url = 'https://raw.githubusercontent.com/Anuken/Mindustry/master/servers_v7.json'
            request ({url: url, json: true}, (error, response, body) => {
                if(!error && response.statusCode === 200){
                    JSON.parse(JSON.stringify(body), (k, v) => {
                        if(k == "name") server[serverIndex].name = v;
                        if(k == "address") server[serverIndex].address = v;
                        if(server[serverIndex].name != "" && server[serverIndex].address != "") {
                            console.log(server);
                            serverIndex++;
                            server[serverIndex] = {name: "", address: ""};
                        }
                        return v;
                    });
                    let embed = new Discord.MessageEmbed().setAuthor(`BE servers`, helpImg).setColor("#186de6");
                    servers.array.forEach(element => {
                        let str = "";
                        element.address.split(", ").forEach(add => str += `• ${add}\n`);
                        embed.addField(element.name, str);
                    });
                    message.channel.send(embed);
                }
                else console.log(error);
            });
        }
    }
}

exports.name = 'ping';
exports.description = 'check bot status';