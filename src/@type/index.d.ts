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
    dropableOnBattle(): boolean;
    dropableOnWalking(): boolean;
    dropableOnShop(): boolean;
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

/*
declare const importPackage: (...pkgs: (android | androidx | java | javax)[]) => any;
declare const importClass: (...pkgs: (android | androidx | java | javax)[]) => any;

namespace Log {
  export function d(data: string, showToast: boolean = false): void;
  export function debug(data: string, showToast: boolean = false): void;
  export function e(data: string, showToast: boolean = false): void;
  export function error(data: string, showToast: boolean = false): void;
  export function i(data: string, showToast: boolean = false): void;
  export function info(data: string, showToast: boolean = false): void;
  export function clear(): void;
}

declare namespace Api {
  export function reload(): boolean;
  export function reload(scriptName: string, throwOnError: boolean = false): boolean;
  export function compile(): boolean;
  export function compile(scriptName: string, throwOnError: boolean = false): boolean;
  export function prepare(scriptName: string): number;
  export function unload(scriptName: string): boolean;
  export function off(): boolean;
  export function off(scriptName: string): boolean;
  export function on(): boolean;
  export function on(scriptName: string): boolean;
  export function isOn(scriptName: string): boolean;
  export function isCompiled(scriptName: string): boolean;
  export function isCompiling(scriptName: string): boolean;
  export function getScriptNames(): string[];
  export function replyRoom(room: string, message: string, hideToast: boolean = false): boolean;
  export function canReply(room: string): boolean;
  export function showToast(content: string, length: number): void;
  export function makeNoti(title: string, content: string, id: number): string[];
  export function papagoTranslate(sourceLanguage: string, targetLanguage: string, content: string, errorToString: boolean = false): string;
  export function gc(): void;
  export function UIThread(func: Function, onComplete: Function): void;
  export function getActiveThreadsCount(scriptName: string): number;
  export function interruptThreads(scriptName: string): void;
  export function isTerminated(scriptName: string): boolean;
  export function markAsRead(room?: string, packageName?: string): boolean;
}
*/