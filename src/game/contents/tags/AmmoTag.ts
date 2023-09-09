import { ItemEntity } from "@/game/Inventory";
import { EmbedBuilder } from "discord.js";

import Item from "../types/Item";
import ItemTag from "./ItemTag";

export default class AmmoTag extends ItemTag {
  public readonly itemPerAmmo: number;
  public readonly name = "Ammo";

  constructor(item: Item, itemPerAmmo = 1) {
    super(item);
    this.itemPerAmmo = itemPerAmmo;
  }

  public buildInfo(embed: EmbedBuilder, entity?: ItemEntity | undefined): EmbedBuilder {
    return embed.addFields({
      name: "items/ammo",
      value: this.itemPerAmmo.toString(),
    });
  }
}
