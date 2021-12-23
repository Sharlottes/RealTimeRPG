import Discord from "discord.js";
import firebase from "firebase-admin";

import config from "./sdk.json";
import { Command } from "./index";

class Test implements Command {
    public readonly name: string;
    public readonly description: string;
    public readonly app: firebase.app.App;
    public readonly database: firebase.database.Database;

    private firebaseConfig: firebase.AppOptions;

    public constructor(...params: any[]) {
        this.name = "test";
        this.description = "test smth";
        
        this.firebaseConfig = config;
        this.app = firebase.initializeApp(this.firebaseConfig);
        this.database = firebase.database();
    }

    public run (client: Discord.Client, message: Discord.Message, args: string[]): void {
        const database = this.database;
        
        try {
            firebase.database().goOnline();
    
            database.ref("/Archive/" + message.author.id).set({
                Message: message.content,
                User: message.author.username,
                User_ID: message.author.id,
            });
            firebase.database().goOffline();
    
            message.channel.send(`hi!`);
        } catch(err) {
            console.log(err);
        }
    }
}

export default Test;