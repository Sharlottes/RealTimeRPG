import { Rationess } from "../@type";
import { User } from "@RTTRPG/game";
import { CommandInteraction } from 'discord.js';

export class BaseEvent implements Rationess {
    ratio: number;
    start: (user: User, interaction: CommandInteraction)=>void;

    constructor(ratio: number, callback: (user: User, interaction: CommandInteraction)=>void) {
        this.start = callback;
        this.ratio = ratio;
    }
}