import { Item } from '..';
import ItemTag from './ItemTag';
import { Durable } from '../../../@type/index';
import { ShieldEntity } from '@RTTRPG/game/Inventory';
import { BaseEmbed } from '../../../modules/BaseEmbed';

export default class ShieldTag extends ItemTag implements Durable {
  public durability: number;
  
  constructor(item: Item, durability: number) {
    super(item);
    this.durability = durability;
  }

  public buildInfo(builder: BaseEmbed, entity?: ShieldEntity) {
    if(entity) builder.addField('current durability', entity.durability.toString());
    return builder.addField('durability', this.durability.toString());
  }
}