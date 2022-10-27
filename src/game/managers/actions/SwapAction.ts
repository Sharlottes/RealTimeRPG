import { EntityI } from "@type";
import { bundle } from "assets";
import { Item, Items } from "game/contents";
import BattleManager from "../BattleManager";
import { BaseAction } from "./BaseAction";

export class SwapAction extends BaseAction {
	private weapon: Item;
	public title = 'swap';

	constructor(manager: BattleManager, owner: EntityI, weapon: Item, immediate = false) {
		super(manager, owner, 3);
		this.weapon = weapon;

		if (immediate) this.run();
	}

	public async run() {
		if (this.weapon != Items.punch && !this.owner.inventory.items.some(store => store.item == this.weapon)) {
			await this.manager.updateLog(bundle.format(this.manager.locale, 'missing_item', this.weapon.localName(this.manager.locale))).update();
			return;
		}
		this.manager.updateLog(bundle.format(this.manager.locale, 'switch_change',
			this.weapon.localName(this.manager.locale),
			this.owner.inventory.equipments.weapon.item.localName(this.manager.locale)
		));
		this.owner.switchWeapon(this.weapon);
		this.manager.updateBar();
		this.manager.validate();
		await this.manager.swapRefresher();
	}

	public description(): string {
		return bundle.format(this.manager.locale, 'action.swap.description', this.owner.inventory.equipments.weapon.item.localName(this.manager.locale), this.weapon.localName(this.manager.locale));
	}

	public isValid(): boolean {
		return this.weapon.hasWeapon();
	}
}
