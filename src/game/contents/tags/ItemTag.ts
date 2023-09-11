import Item from "../types/Item";
import { EmbedBuilder } from "discord.js";
import { ItemEntity } from "@/game/Inventory";

export default abstract class ItemTag {
  public readonly item: Item;
  public abstract readonly name: string;

  constructor(item: Item) {
    this.item = item;
  }

  public abstract buildInfo(builder: EmbedBuilder, entity?: ItemEntity): EmbedBuilder;
}
