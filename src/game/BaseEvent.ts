import { EventData } from "../@type";
import { User } from "@RTTRPG/game";
import { CommandInteraction } from 'discord.js';

export class BaseEvent {
    data: EventData;
    start: (user: User, interaction: CommandInteraction)=>void;

    constructor(data: EventData, callback: (user: User, interaction: CommandInteraction)=>void) {
        this.start = callback;
        this.data = data;
    }
}