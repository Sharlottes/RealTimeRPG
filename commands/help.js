const Discord = require('discord.js');

//run이라는 메소드(function)을 export(수출)
exports.run = (client, msg, args) => {
    let helpImg = "https://images-ext-1.discordapp.net/external/RyofVqSAVAi0H9-1yK6M8NGy2grU5TWZkLadG-rwqk0/https/i.imgur.com/EZRAPxR.png"
    let commandList = [
        { name: "ping", desc: "check bot status" },
        { name: "help", desc: "show avaliable commands" },
        { name: "info <unitname>", desc: "show its information" },
        { name: "create <unitname>", desc: "add new unit" }
    ]
    let commandStr = ""
    let embed = new Discord.MessageEmbed().setAuthor("Avaliable Commands", helpImg).setColor("#186de6")

    commandList.forEach((x) => {
        commandStr += `• !${x.name} : **${x.desc}**\n`
    })

    embed.addField("Commands: ", commandStr)

    message.channel.send(embed)
};

exports.name = "help"