import Discord from "discord.js";
import firebase from "firebase-admin";

import { Command } from "./index";

class Test implements Command {
    public readonly name: string;
    public readonly description: string;
    
    constructor(...params: any[]) {
        this.name = "test";
        this.description = "test smth";
    }

    public run (client: Discord.Client, message: Discord.Message, args: string[]) {

    }
}

export default Test;