import { Item } from '..';
import ItemTag from './ItemTag';
import { Durable } from '../../../@type/index';
import { ShieldEntity } from 'game/Inventory';
import { EmbedBuilder } from 'discord.js';

export default class ShieldTag extends ItemTag implements Durable {
  public readonly durability: number;
  public readonly name = "Shield";
  
  constructor(item: Item, durability: number) {
    super(item);
    this.durability = durability;
  }

  public buildInfo(embed: EmbedBuilder, entity?: ShieldEntity) {
    if(entity) embed.addFields({
      name: 'current durability', 
      value: entity.durability.toString()
    });
    return embed.addFields({
      name: 'durability', 
      value: this.durability.toString()
    });
  }
}