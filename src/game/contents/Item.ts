import { Dropable, ItemData, Rationess } from "@뇌절봇/@type";
import { Content, Items } from "./Content";

export class Item extends Content implements Dropable, Rationess {
	readonly rare: number;
	readonly id: number;
	readonly dropOnWalk: boolean;
	readonly dropOnBattle: boolean;
	readonly dropOnShop: boolean;

	constructor(data: ItemData) {
		super(data.name, 'item');
		this.rare = data.rare;
		this.id = Items.items.length;
		this.dropOnBattle = data.drop?.dropOnBattle===undefined?true:data.drop.dropOnBattle;
		this.dropOnShop = data.drop?.dropOnShop===undefined?true:data.drop.dropOnShop;
		this.dropOnWalk = data.drop?.dropOnWalk===undefined?true:data.drop.dropOnWalk;
	}

	getRatio() {
		return this.rare;
	}
}