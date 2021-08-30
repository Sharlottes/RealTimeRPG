const Discord = require('discord.js');
const fs = require('fs');

exports.run = (client, message, args) => {
    let jsonFiles = fs.readdirSync('./json');
    let kvStrs = ""
    jsonFiles.forEach(f => {
        message.channel.send("debug: check type - " + f.split(".")[0] + " and " + args[0]);
        if(f.split(".")[0] != args[0]) return;

        let jsonData = fs.readFileSync("./json/" + f);
        JSON.parse(jsonData.toString(), (k, v) => {
            if(k == args[1]) kvStrs += (k + ": " + v + "\n"); 
            return v; 
        });
    });
    let helpImg = "https://images-ext-1.discordapp.net/external/RyofVqSAVAi0H9-1yK6M8NGy2grU5TWZkLadG-rwqk0/https/i.imgur.com/EZRAPxR.png"
    let embed = new Discord.MessageEmbed().setAuthor(args[0] + " - " + args[2], helpImg).setColor("#186de6")

    embed.addField("Values: ", kvStrs)
    message.channel.send(embed)
};

exports.name = "content";
exports.description = "show contents";