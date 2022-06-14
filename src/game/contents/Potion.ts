import { Consumable, ItemData } from "@RTTRPG/@type";
import { Buff, Item } from "@RTTRPG/game/contents";
import { EntityI } from '../../@type/index';

export default class Potion extends Item implements Consumable {
	readonly buffes: Buff[];

	constructor(data: ItemData, buffes: Buff[]) {
		super(data);
		this.buffes = buffes;
	}

	consume(owner: EntityI, amount = 1) {
		this.buffes.forEach((b) => b.buff(owner, amount));
	}
}