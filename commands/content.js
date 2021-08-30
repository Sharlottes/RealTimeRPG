const Discord = require('discord.js');
const fs = require('fs');

exports.run = (client, message, args) => {
    let jsonFiles = fs.readdirSync('./json');
    let kvStrs = ""
    let stop = false;
    jsonFiles.forEach(f => {
        if(stop) return;
        message.channel.send(`debug: check type - ${f.split(".")[0]} and ${args[0]}`);
        if(f.split(".")[0] != args[0]) return;
        message.channel.send(`debug: check type - **${f.split(".")[0]}** matched!`);

        let jsonBuffer = fs.readFileSync("./json/" + f);
        let jsonData = JSON.parse(jsonBuffer.toString());
        if(jsonData[args[1]] !== undefined) {
            let value =  JSON.stringify(jsonData[args[1]]);
            console.log(`${args[1]} - ${value}`);
            JSON.parse(value, (k1, v1) => {
                kvStrs += `${k1} : ${JSON.stringify(v1)}\n`; 
                return v1;
            });        
        }
        stop = true;
    });
    let helpImg = "https://images-ext-1.discordapp.net/external/RyofVqSAVAi0H9-1yK6M8NGy2grU5TWZkLadG-rwqk0/https/i.imgur.com/EZRAPxR.png"

    if(kvStrs.length >= 1000) {
        for(var str of kvStrs.split(0, 1000)){
            //let embed = new Discord.MessageEmbed().setAuthor(args[0] + " - " + args[1], helpImg).setColor("#186de6");
            //embed.addField("Values: ", str);
            message.channel.send(str);
        }
    } else {
        //let embed = new Discord.MessageEmbed().setAuthor(args[0] + " - " + args[1], helpImg).setColor("#186de6");
        //embed.addField("Values: ", kvStrs === "" ? "<Empty>" : kvStrs);
        message.channel.send(kvStrs === "" ? "<Empty>" : kvStrs);

    }

};

exports.name = "content";
exports.description = "show contents";