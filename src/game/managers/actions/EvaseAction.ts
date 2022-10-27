import { EntityI } from "@type";
import { bundle } from "assets";
import BattleManager from "../BattleManager";
import { BaseAction } from "./BaseAction";

export class EvaseAction extends BaseAction {
	public title = 'evase';

	constructor(manager: BattleManager, owner: EntityI, immediate = false) {
		super(manager, owner, 1);

		if (immediate) this.run();
	}

	public async run() {
		this.manager.setEvasion(this.owner, true);

		await this.manager.updateLog(bundle.format(this.manager.locale, 'evasion_position',
			typeof this.owner.name === 'string' ? this.owner.name : this.owner.name(this.manager.locale)
		)).update();
	}

	public description(): string {
		return bundle.find(this.manager.locale, 'action.evase.description');
	}

	public isValid(): boolean {
		return !this.manager.isEvasion(this.owner);
	}
}