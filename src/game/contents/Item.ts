import { Dropable, Rationess, ItemData } from "@RTTRPG/@type";
import { Content, Items } from ".";


export default class Item extends Content implements Dropable, Rationess {
	readonly ratio: number;
	readonly id: number;
	readonly dropOnWalk: boolean;
	readonly dropOnBattle: boolean;
	readonly dropOnShop: boolean;
	readonly tags: ItemTag[] = [];

	constructor(data: ItemData) {
		super(data.name, 'item');
		this.ratio = data.ratio;
		this.id = Items.items.length;
		this.dropOnBattle = data.dropOnBattle??true;
		this.dropOnShop = data.dropOnShop??true;
		this.dropOnWalk = data.dropOnWalk??true;
	}

	public addTags(tags: ItemTag[]): this {
		tags.forEach(tag=>this.tags.push(tag));
		return this;
	}
}

class ItemTag {
	
}

class AmmoItemTag extends ItemTag {
	readonly itemPerAmmo: number;

	constructor(itemPerAmmo: number) {
		super();
		this.itemPerAmmo = itemPerAmmo;
	}
}