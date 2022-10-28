import { EntityI } from "@type";
import { bundle } from "assets";
import { ItemStack, SlotWeaponEntity } from "game/Inventory";
import BattleManager from "../BattleManager";
import { BaseAction } from "./BaseAction";

export class ReloadAction extends BaseAction {
	public title = 'reload';

	constructor(manager: BattleManager, owner: EntityI, public stack: ItemStack, public amount: number,
		immediate = false) {
		super(manager, owner, 1);

		if (immediate) this.run();
	}

	public async run() {
		super.run();
		
		const entity = this.owner.inventory.equipments.weapon;
		if (entity instanceof SlotWeaponEntity) {
			const inc = this.stack.item.getAmmo()?.itemPerAmmo ?? 1;
			this.owner.inventory.remove(this.stack.item, this.amount);
			for (let i = 0; i < this.amount; i += inc) entity.ammos.push(this.stack.item);
			this.manager.updateLog(bundle.format(this.manager.locale, 'reload',
				this.stack.item.localName(this.manager.locale),
				this.amount,
				this.owner.inventory.equipments.weapon.item.localName(this.manager.locale)
			));
			await this.manager.reloadRefresher();
		}
	}

	public description(): string {
		return bundle.format(this.manager.locale, 'action.reload.description',
			this.stack.item.localName(this.manager.locale),
			this.stack.amount,
			this.owner.inventory.equipments.weapon.item.localName(this.manager.locale)
		);
	}

	public isValid(): boolean {
		return this.stack.item.hasAmmo();
	}
}