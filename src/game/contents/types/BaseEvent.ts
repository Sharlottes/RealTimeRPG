import { CommandInteraction } from 'discord.js';

import { Rationess } from "@RTTRPG/@type";
import { User } from "@RTTRPG/game";

//이딴게 이벤트?
export default class BaseEvent implements Rationess {
    constructor(
        public ratio: number, 
        public start: (user: User, interaction: CommandInteraction) => void
    ) {}
}