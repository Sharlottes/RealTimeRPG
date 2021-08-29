const Discord = require('discord.js');

exports.run = (client, message, args) => {
    let helpImg = "https://images-ext-1.discordapp.net/external/RyofVqSAVAi0H9-1yK6M8NGy2grU5TWZkLadG-rwqk0/https/i.imgur.com/EZRAPxR.png"
    let commandStr = ""
    let embed = new Discord.MessageEmbed().setAuthor("Avaliable Commands", helpImg).setColor("#186de6")
    let cmd = client.commands.get(command);
    
    client.commands.forEach((x) => {
        commandStr += `• !${x.name} : **${x.desc}**\n`
    })

    embed.addField("Commands: ", commandStr)

    message.channel.send(embed)
};

exports.name = "help";
exports.description = "show avaliable commands";