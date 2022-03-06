import Discord, { CacheType } from 'discord.js';

import { PagesBuilder } from 'discord.js-pages';
import { User } from '../modules';
import { ItemStack } from './contents';

export interface Heathy { 
    health: number;
    healthRegen: number;
}

export interface Energy {
    energy: number;
    energyRegen: number;
}

export interface Consumable {
    consume(user: User, amount: number): string;
}

export interface Durable {
    durability: number;
}

export interface Dropable {
    dropOnWalk?: boolean;
    dropOnShop?: boolean;
    dropOnBattle?: boolean;
}

export interface Rationess {
	getRatio(): number;
}

export interface Event {
    onStart(r): unknown;
}

export type EventData = {
    ratio: number,
    title?: string
}

export type LatestMsg = {
  user: User,
  msg: Message
};

export type Stat = {
  health: number;
  health_max: number;
  health_regen: number;
  energy: number;
  energy_max: number;
  energy_regen: number;
  strength: number;
  defense: number;
};

export type Inventory = {
  items: ItemStack[];
  weapon: ItemStack;
};

export type Message = {
    interaction: Discord.CommandInteraction<CacheType>,
    builder: PagesBuilder | null
}

export type CommandInfo = {
    id: string;
    application_id: string;
    version: string;
    default_permissions: null;
    type: number;
    name: string;
    description: string;
    guild_id: string;
};

export type ItemData = {
    name: string;
    rare: number;
    drop?: Dropable;
}