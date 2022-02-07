import { Event } from ".";
import { User } from "../modules";
import { Message } from '../index';
import Assets from "@뇌절봇/assets";
import { findMessage, Rationess } from "@뇌절봇/game/rpg_";

export class BaseEvent implements Event, Rationess {
    ratio: number;
    title: string;
    onStart: (user: User)=>void;

    constructor(ratio: number, title: string, callback?: (user: User)=>void) {
        this.onStart = callback || (()=>{return});
        this.ratio = ratio;
        this.title = title;
    }

    start(user: User) {
        if(this.title) findMessage(user)?.interaction.editReply(Assets.bundle.find(user.lang, this.title));
        this.onStart(user);
    }
    
    getRatio(): number {
        return this.ratio;
    }
}