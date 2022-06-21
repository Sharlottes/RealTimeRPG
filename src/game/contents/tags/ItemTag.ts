import { ItemEntity } from "@RTTRPG/game";
import { Item } from "..";
import { BaseEmbed } from '../../../modules/BaseEmbed';

export default abstract class ItemTag {
  item: Item;
  
  constructor(item: Item) {
    this.item = item;
  }

  public abstract buildInfo(builder: BaseEmbed, entity?: ItemEntity): BaseEmbed;
}