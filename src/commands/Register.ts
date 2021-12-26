import { Client, Message } from "discord.js";
import Auth from "firebase-admin/auth";

import { firebaseAdmin as admin } from "../";
import { Account } from "../auth"
import { Command } from ".";

class Register implements Command {
    public readonly name: string;
    public readonly description: string;
    private auth: Auth.Auth;
    
    public constructor() {
        this.name = "register";
        this.description = "";
        this.auth = admin.auth;
    }
    
    public run(client: Client, message: Message, args: string[]) {
        if(message.channel.type == "dm") {
            const auth = this.auth;
            
            auth.getUser(args[0]).then(record => {
                console.log(record.displayName);
            }).catch(reason => {
                console.log(reason);
            })
        } else {
            message.reply("You can only use this command on the dm channel!");
        }
    }
}

export default Register;