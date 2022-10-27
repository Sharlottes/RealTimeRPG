import { ItemEntity } from "game";
import { EmbedBuilder } from "discord.js";
import { Item } from "..";

export default abstract class ItemTag {
  public readonly item: Item;
  public readonly abstract name: string;
  
  constructor(item: Item) {
    this.item = item;
  }

  public abstract buildInfo(builder: EmbedBuilder, entity?: ItemEntity): EmbedBuilder;
}