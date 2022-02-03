import { Event } from ".";
import { User } from "../modules";
import { Message } from '../index';
import Assets from "@뇌절봇/assets";
import { Rationess } from "@뇌절봇/game/rpg_";

export class BaseEvent implements Event, Rationess {
    ratio: number;
    title: string;
    onStart: (user: User, msg: Message)=>void;

    constructor(ratio: number, title: string, callback?: (user: User, msg: Message)=>void) {
        this.onStart = callback || (()=>{return});
        this.ratio = ratio;
        this.title = title;
    }

    start(user: User, msg: Message) {
        if(this.title) msg.interaction.editReply(Assets.bundle.find(user.lang, this.title));
        this.onStart(user, msg);
    }
    
    getRatio(): number {
        return this.ratio;
    }
}