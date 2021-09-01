const Discord = require('discord.js');
const tcpp = require('tcp-ping');
const request = require('request');

exports.run = (client, message, args) => {
    message.reply(`${client.ws.ping}ms`);
    if(args[0] !== undefined) {
        if(args[0] === "v7" || args[0] === "v6" || args[0] === "be"){
            let server = [{
                name: "",
                address: ""
            }]
            let serverIndex = 0;
            let url = `https://raw.githubusercontent.com/Anuken/Mindustry/master/servers_${args[0]}.json`
            let helpImg = "https://images-ext-1.discordapp.net/external/RyofVqSAVAi0H9-1yK6M8NGy2grU5TWZkLadG-rwqk0/https/i.imgur.com/EZRAPxR.png"
            let embed = new Discord.MessageEmbed().setAuthor(`${args[0]} servers`, helpImg).setColor("#186de6");
            request({url: url, json: true}, (error, response, body) => {
                if(!error && response.statusCode === 200){
                    JSON.parse(JSON.stringify(body), (k, v) => {
                        if(k == "name") server[serverIndex].name = v;
                        if(k == "address") server[serverIndex].address = v;
                        if(server[serverIndex].name != "" && server[serverIndex].address != "") 
                            server[++serverIndex] = {name: "", address: ""};
                        return v;
                    });
                    server.forEach((x, indexx, arrs) => {
                        let started = new Date().getTime();
                        let strs = "";
                        (x.address+'').split(",").forEach((str, index, arr) => {
                            tcpp.probe((str+'').split(":")[0], (str+'').split(":")[1], (err, available) => {
                                strs += `${str} - ${new Date().getTime() - started}ms\n`;
                                if(idex == arr.length - 1) embed.addField(x.name, strs);
                                if(indexx == arrs.length - 1) message.channel.send(embed);
                            });
                        });
                    });
                }
                else console.log(error);
            });
        } else {
            let started = new Date().getTime();
            tcpp.probe(args[0], args[1] === undefined ? 6567 : args[1], (err, available) => message.channel.send(`${args[0]}, ${new Date().getTime() - started}ms`));
        }
    }
}

exports.name = 'ping';
exports.description = 'check bot status';