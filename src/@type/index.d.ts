import Discord, { CacheType, MessageActionRow, MessageComponentInteraction, MessageActionRowComponent } from 'discord.js';

import { PagesBuilder } from 'discord.js-pages';
import { StatusEntity, ItemStack, User, Inventory } from '@RTTRPG/game';
import { BaseEmbed } from '@RTTRPG/modules';
import { StatusEffect, Weapon } from '@RTTRPG/game/contents';

export interface Heathy { 
    health: number
    health_max: number
    health_regen: number
}

export interface Energy {
    energy: number
    energy_max: number
    energy_regen: number
}

export interface Consumable {
    consume(user: User, amount: number): void
}

export interface Durable {
    durability: number
}

export interface Dropable {
    dropOnWalk?: boolean
    dropOnShop?: boolean
    dropOnBattle?: boolean
}

export interface Rationess {
	ratio: number
}

export type Stat = {
  strength: number
  defense: number
} & Heathy & Energy; 

export type Message = {
    interaction: Discord.CommandInteraction<CacheType>,
    builder: BaseEmbed,
    sender: User
}

export type CommandInfo = {
    id: string
    application_id: string
    version: string
    default_permissions: null
    type: number
    name: string
    description: string
    guild_id: string
}

export type ContentData = {
    name: string
    description: string
    details: string
}

export type ItemData = {
    name: string
} & Rationess & Dropable

export type UnitData = {
    name: string
    level: number
    inventory?: Inventory
    stats: Stat
} & Rationess

export type UserSave = {
    id: string
    money: number,
    level: number,
    exp: number,
    stats: Stat,
    inventory: InventoryJSONdata,
    fountContents: {items: number[], units: number[]}
}

export type InventoryJSONdata = {
    items: [{
        type: string,
        item: number,
        durability?: number,
        cooldown?: number,
        amount?: number,
        ammos?: number[]
    }],
    equipments: {
        weapon: {
            type: string,
            item: number,
            durability: number,
            cooldown: number,
            ammos?: number[]
        }
    }
}

export type EventTrigger = (user: User, components: MessageActionRow[], interactionCallback: MessageComponentInteraction, currentRow: MessageActionRowComponent)=>void;

export type EventSelection = {
    readonly name: string;
    readonly type: "button" | "select";
    readonly callback: EventTrigger;
    readonly options?: (InteractionButtonOptions | MessageSelectMenuOptions);
}

export type CommandCategory = "guild" | "global"

export interface EntityI extends StatusI {
    public readonly id: number|string;
    public readonly stats: Stat;
    public readonly inventory: Inventory;
    public readonly name: string|((locale: string)=>string);
    public exp: number;
    public level: number;
    public money: number;
    public switchWeapon: (weapon: Weapon) => void;
}

export interface StatusI {
    public readonly statuses: StatusEntity[] = [];
    public applyStatus: (status: StatusEffect) => void;
    public removeStatus: (status: StatusEffect) => void;
}