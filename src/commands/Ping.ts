import Discord, { Client, Message } from 'discord.js';
import tcpp from "tcp-ping";
import request from "request";

import { Command } from '.'

class Ping implements Command {
    public readonly name: string;
    public readonly description: string;

    public constructor() {
        this.name = "ping";
        this.description = "check bot status";
    }

    public run(client: Client, message: Message, args: string[]) {
        
    }
    
}

export default Ping;