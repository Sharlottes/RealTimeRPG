import Discord, { CacheType } from 'discord.js';

import { PagesBuilder } from 'discord.js-pages';
import { ItemStack, User } from '@RTTRPG/game';
import { BaseEmbed } from '@RTTRPG/modules';

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
    consume(user: User, amount: number): string
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

export type EventData = {
    title?: string
} & Rationess

export type Stat = {
  strength: number
  defense: number
} & Heathy & Energy; 

export type Inventory = {
  items: ItemStack[]
  weapon: ItemStack
}

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

export type CommandOption = 'string' | 'float' | 'int'

export type UserSave = {
      id: string
      money: number,
      level: number,
      exp: number,
      stats: Stat,
      inventory: Inventory,
      fountContents: {items: number[], units: number[]}
}

export type EventTrigger = (user: User, components: MessageActionRow[], interactionCallback: MessageComponentInteraction, currentRow: MessageActionRowComponent)=>void;

export type EventSelection = {
    readonly name: string;
    readonly type: "button" | "select";
    readonly callback: EventTrigger;
    readonly options?: (InteractionButtonOptions | MessageSelectMenuOptions);
}

export type CommandCategory = "guild" | "global"