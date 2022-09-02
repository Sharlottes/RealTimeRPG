import { ItemEntity } from "@RTTRPG/game/Inventory";
import { MessageEmbed } from "discord.js";
import { ItemTag } from ".";
import { Item } from "..";

export default class AmmoTag extends ItemTag {
	public readonly itemPerAmmo: number;
	public readonly name = "Ammo";

	constructor(item: Item, itemPerAmmo = 1) {
		super(item);
		this.itemPerAmmo = itemPerAmmo;
	}
	
	public buildInfo(embed: MessageEmbed, entity?: ItemEntity | undefined): MessageEmbed {
		return embed.addField('items/ammo', this.itemPerAmmo.toString());
	}
}