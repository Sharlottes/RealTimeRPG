import { Consumable, ItemData } from "@RTTRPG/@type";
import { bundle } from "@RTTRPG/assets";
import { User } from "@RTTRPG/game";
import { Item } from "@RTTRPG/game/contents";

export default class Potion extends Item implements Consumable {
	readonly buffes: Buff[];

	constructor(data: ItemData, buffes: Buff[]) {
		super(data);
		this.buffes = buffes;
	}

	consume(user: User, amount = 1) {
		return bundle.format(user.locale, 'consume', this.localName(user), amount, this.buffes.map((b) => b.buff(user, amount)).join('\n  '));
	}
}