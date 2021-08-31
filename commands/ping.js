const tcpp = require('tcp-ping');

exports.run = (client, message, args) => {
    message.reply(`from ${client.user.name}, ${client.ws.ping}ms`);
    if(args[0] !== undefined) {
        let started = new Date().getTime();
        tcpp.probe(args[0], args[1] === undefined ? 6567 : args[1], (err, available) => message.reply(`from ${arg[0]}, ${new Date().getTime() - started}ms`));
    }
}

exports.name = 'ping';
exports.description = 'check bot status';