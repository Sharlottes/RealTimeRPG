const Discord = require('discord.js');

exports.run = (client, message, args) => {
    message.reply(`${client.ws.ping}ms`);
    message.reply("pong!");
};

exports.name = 'ping';
exports.description = 'check bot status';