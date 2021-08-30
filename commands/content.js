const Discord = require('discord.js');
const fs = require('fs');
const jsonFiles = fs.readdirSync('./json', 'utf8');

exports.run = (client, message, args) => {
    let kvStrs = ""
    jsonFiles.forEach(f => {
        if(f.split(".")[1] != args[1]) return;

        let jsonData = fs.readFileSync("./json/" + f);
        JSON.parse(jsonData.toString(), (k, v) => {
            if(k == arg[2]) kvStrs += (k + ": " + v + "\n"); 
            return v; 
        });
    });
    let helpImg = "https://images-ext-1.discordapp.net/external/RyofVqSAVAi0H9-1yK6M8NGy2grU5TWZkLadG-rwqk0/https/i.imgur.com/EZRAPxR.png"
    let embed = new Discord.MessageEmbed().setAuthor(args[1] + " - " + args[2], helpImg).setColor("#186de6")

    embed.addField("Values: ", kvStrs)
    message.channel.send(embed)
};

exports.name = "content";
exports.description = "show contents";