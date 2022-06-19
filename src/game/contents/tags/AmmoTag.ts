import { ItemTag } from ".";
import { Item } from "..";

export default class AmmoTag extends ItemTag {
	readonly itemPerAmmo: number;

	constructor(item: Item, itemPerAmmo = 1) {
		super(item);
		this.itemPerAmmo = itemPerAmmo;
	}
}