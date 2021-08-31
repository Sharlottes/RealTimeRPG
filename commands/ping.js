const tcpp = require('tcp-ping');

exports.run = (client, message, args) => {
    message.reply(`${client.ws.ping}ms`);
    message.reply("pong!");
    if(args[0] !== undefined) {
        let started = new Date().getTime();
        tcpp.probe(args[0], args[1] === undefined ? 6567 : args[1], (err, available) => message.reply(`${new Date().getTime() - started}ms`));
    }
}

exports.name = 'ping';
exports.description = 'check bot status';