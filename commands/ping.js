const tcpp = require('tcp-ping');

exports.run = (client, message, args) => {
    message.reply(`${client.ws.ping}ms`);
    message.reply("pong!");
    if(args[0] !== undefined) 
        tcpp.probe(args[0], args[1] === undefined ? 6567 : args[1], (err, available) => message.channel.send(avaliable));
};

exports.name = 'ping';
exports.description = 'check bot status';