const Discord = require('discord.js');
const tcpp = require('tcp-ping');
const request = require('request');

exports.run = (client, message, args) => {
    message.reply(`${client.ws.ping}ms`);
    if(args[0] !== undefined) {
        if(args[0] === "v7" || args[0] === "v6" || args[0] === "be"){
            let url = `https://raw.githubusercontent.com/Anuken/Mindustry/master/servers_${args[0]}.json`
            let helpImg = "https://images-ext-1.discordapp.net/external/RyofVqSAVAi0H9-1yK6M8NGy2grU5TWZkLadG-rwqk0/https/i.imgur.com/EZRAPxR.png"
            request({url: url, json: true}, (error, response, body) => {
                if(!error && response.statusCode === 200){
                    let parsed = JSON.parse(JSON.stringify(body));
                    let embed = new Discord.MessageEmbed().setAuthor(`${args[0]} Servers`, helpImg).setColor("#186de6");

                    parsed.forEach(v => {
                        let parsedParsed = JSON.parse(JSON.stringify(v));
                        let name = parsedParsed["name"];
                        let address = (parsedParsed["address"]+'').replace("[", "").replace("]", "");
                        let arr = (address+'').split(",");
                        let field = "";
                        arr.forEach(str => {
                            let started = new Date().getTime();
                            tcpp.probe((str+'').split(":")[0], (str+'').split(":")[1] === undefined ? 6567 : (str+'').split(":")[1], (err, available) => {
                                field += `${str} - ${new Date().getTime() - started}ms\n`;
                                if(arr.indexOf(str) == arr.length - 1) {
                                    embed.addField(name, field);
                                    if(parsed.indexOf(v) == parsed.length - 1) message.channel.send(embed);
                                }
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