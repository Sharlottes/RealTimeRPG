import { ItemTag } from ".";

export default class AmmoItemTag extends ItemTag {
	readonly itemPerAmmo: number;

	constructor(itemPerAmmo = 1) {
		super();
		this.itemPerAmmo = itemPerAmmo;
	}
}