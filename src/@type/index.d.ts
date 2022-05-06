import Discord, { CacheType } from 'discord.js'

import { PagesBuilder } from 'discord.js-pages'
import { User } from '../modules'
import { ItemStack } from './contents'

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

export interface Event {
    onStart(r): unknown
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
  weapon: ItemStack&Durable
}

export type Message = {
    interaction: Discord.CommandInteraction<CacheType>,
    builder?: PagesBuilder | null
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
    items: ItemStack[]
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