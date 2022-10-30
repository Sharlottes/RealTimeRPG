import { EntityI } from "@type";
import { bundle } from "assets";
import BattleManager from "../BattleManager";
import Manager from "../Manager";

export abstract class BaseAction {
	public abstract title: string;
	public manager: BattleManager;
	public owner: EntityI;
	public cost: number;
	public bloody = false;
	private eventListeners: Record<string, Array<() => void>> = {
		added: [],
		runned: [],
		undo: [],
	}

	constructor(manager: BattleManager, owner: EntityI, cost: number, immediate = false) {
		this.manager = manager;
		this.owner = owner;
		this.cost = cost;

		if (immediate) this.run();
	}

	public abstract description(): string;
	public abstract isValid(): boolean;

	public addListener(event: keyof typeof this.eventListeners, callback: () => void) {
		this.eventListeners[event].push(callback);
		return this;
	}

	public enableBloody(): void {
		this.bloody = true;
		Manager.newTextEmbed(this.manager.interaction, bundle.find(this.manager.locale, 'alert.bloody_action'), bundle.find(this.manager.locale, 'alert'));
	}

	public async run(): Promise<void> {
		for (const listener of this.eventListeners.runned) {
			listener();
		}
	};

	public undo(): void {
		for (const listener of this.eventListeners.undo) {
			listener();
		}
		if (this.bloody) this.owner.stats.health += this.cost;
		else this.owner.stats.energy += this.cost;
	}

	public added(): void {
		for (const listener of this.eventListeners.added) {
			listener();
		}
		if (this.bloody) {
			this.owner.stats.health -= this.cost;
		} else {
			this.owner.stats.energy -= this.cost;
		}
	}
}
