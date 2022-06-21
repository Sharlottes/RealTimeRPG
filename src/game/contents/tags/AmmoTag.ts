import { ItemEntity } from "@RTTRPG/game/Inventory";
import { BaseEmbed } from "@RTTRPG/modules";
import { ItemTag } from ".";
import { Item } from "..";

export default class AmmoTag extends ItemTag {
	readonly itemPerAmmo: number;

	constructor(item: Item, itemPerAmmo = 1) {
		super(item);
		this.itemPerAmmo = itemPerAmmo;
	}
	
	public buildInfo(builder: BaseEmbed, entity?: ItemEntity | undefined): BaseEmbed {
		return builder.addField('items/ammo', this.itemPerAmmo.toString());
	}
}