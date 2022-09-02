import { ItemEntity } from "@RTTRPG/game";
import { MessageEmbed } from "discord.js";
import { Item } from "..";

export default abstract class ItemTag {
  public readonly item: Item;
  public readonly abstract name: string;
  
  constructor(item: Item) {
    this.item = item;
  }

  public abstract buildInfo(builder: MessageEmbed, entity?: ItemEntity): MessageEmbed;
}