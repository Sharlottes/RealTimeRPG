import { CommandInteraction } from 'discord.js';

import { Rationess } from "@RTTRPG/@type";
import { User } from "@RTTRPG/game";

export default class BaseEvent implements Rationess {
    ratio: number;
    start: (user: User, interaction: CommandInteraction)=>void;

    constructor(ratio: number, callback: (user: User, interaction: CommandInteraction)=>void) {
        this.start = callback;
        this.ratio = ratio;
    }
}