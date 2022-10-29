import { EntityI } from "@type";
import { bundle } from "assets";
import { Item, Items } from "game/contents";
import { WeaponEntity } from 'game/Inventory';
import { predicateOf } from 'utils/predicateOf';
import BattleManager from "../BattleManager";
import Manager from '../Manager';
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
		const entity = this.weapon === Items.punch || this.weapon === Items.none
			? new WeaponEntity(this.weapon)
			: this.owner.inventory.items.find(predicateOf<WeaponEntity>()((store) =>
				store instanceof WeaponEntity && store.item == this.weapon
			));
		if (!entity) {
			Manager.newErrorEmbed(this.manager.interaction, bundle.format(this.manager.locale, 'error.missing_item', this.weapon.localName(this.manager.locale)));
			return;
		}

		super.run();

		this.manager.updateLog(bundle.format(this.manager.locale, 'switch_change',
			this.weapon.localName(this.manager.locale),
			this.owner.inventory.equipments.weapon.item.localName(this.manager.locale)
		));
		this.owner.switchWeapon(entity);
		this.manager.updateBar();
		this.manager.validate();
	}

	public description(): string {
		return bundle.format(this.manager.locale, 'action.swap.description', this.owner.inventory.equipments.weapon.item.localName(this.manager.locale), this.weapon.localName(this.manager.locale));
	}

	public isValid(): boolean {
		return this.weapon.hasWeapon();
	}
}
