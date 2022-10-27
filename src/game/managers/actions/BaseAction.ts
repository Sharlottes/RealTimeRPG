import { EntityI } from "@type";
import { bundle } from "assets";
import BattleManager from "../BattleManager";
import Manager from "../Manager";

export abstract class BaseAction {
	public abstract title: string;
	public manager: BattleManager;
	public owner: EntityI;
	public cost: number;
	private bloody = false;

	constructor(manager: BattleManager, owner: EntityI, cost: number, immediate = false) {
		this.manager = manager;
		this.owner = owner;
		this.cost = cost;

		if (immediate) this.run();
	}

	public abstract run(): Promise<void>;
	public abstract description(): string;
	public abstract isValid(): boolean;
	public undo(): void {
		if (this.bloody) this.owner.stats.health += this.cost;
		else this.owner.stats.energy += this.cost;
	}
	public onAdded(): void {
		if (this.owner.stats.energy < this.cost) {
			this.owner.stats.health -= this.cost;
			this.bloody = true;
			Manager.newTextEmbed(this.manager.interaction, bundle.find(this.manager.locale, 'alert.bloody_action'), bundle.find(this.manager.locale, 'alert'));
		} else {
			this.owner.stats.energy -= this.cost;
		}
	}
}
