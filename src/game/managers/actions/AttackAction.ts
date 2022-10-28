import Random from "random";
import { BaseAction } from "./BaseAction";
import { EntityI } from '@type';
import { bundle } from "assets";
import { Items } from "game/contents";
import { WeaponEntity } from "game/Inventory";
import BattleManager from "../BattleManager";

export class AttackAction extends BaseAction {
	private enemy: EntityI;
	public title = 'attack';

	constructor(manager: BattleManager, owner: EntityI, enemy: EntityI, immediate = false) {
		super(manager, owner, 10);
		this.enemy = enemy;

		if (immediate) this.run();
	}

	public async run(): Promise<void> {
		super.run();

		if (this.owner.stats.health <= 0 || this.enemy.stats.health <= 0) return;
		const entity = this.owner.inventory.equipments.weapon;
		const isUser = this.owner.id == this.manager.user.id;
		const name = typeof this.enemy.name === 'string' ? this.enemy.name : this.enemy.name(this.manager.locale);
		if (this.manager.isEvasion(this.enemy)) {
			if (Random.bool()) {
				await this.manager.updateLog((isUser ? '- ' : '+ ') + bundle.format(this.manager.locale, "evasion_successed", name)).update();
			} else {
				await this.manager.updateLog((isUser ? '+ ' : '- ') + bundle.format(this.manager.locale, "evasion_failed", name)).update();
				await this.manager.updateLog((isUser ? '+ ' : '- ') + entity.item.getWeapon()?.attack(this.enemy, entity, this.manager.locale)).update();
			}
		} else if (this.manager.isShielded(this.enemy)) {
			if (this.enemy.inventory.equipments.shield) this.enemy.inventory.equipments.shield.durability -= this.owner.inventory.equipments.weapon.item.getWeapon().damage;
			await this.manager.updateLog((isUser ? '- ' : '+ ') + bundle.format(this.manager.locale, "shielded", name)).update();
		} else {
			await this.manager.updateLog((isUser ? '+ ' : '- ') + entity.item.getWeapon()?.attack(this.enemy, entity, this.manager.locale)).update();
		}

		if (entity.item != Items.punch && entity.item != Items.none) {
			if (entity.durability > 0) entity.durability--;
			if (entity.durability <= 0) {
				await this.manager.updateLog(bundle.format(this.manager.locale, 'battle.broken', entity.item.localName(this.manager.locale))).update();
				const exist = this.owner.inventory.items.find<WeaponEntity>((store): store is WeaponEntity => store instanceof WeaponEntity && store.item == this.owner.inventory.equipments.weapon.item);
				if (exist) {
					this.owner.inventory.items.splice(this.owner.inventory.items.indexOf(exist), 1);
					this.owner.inventory.equipments.weapon = exist;
					await this.manager.updateLog(bundle.find(this.manager.locale, "battle.auto_swap")).update();
				}
				else this.owner.inventory.equipments.weapon = new WeaponEntity(Items.punch);
			}
		}
	}

	public description(): string {
		return bundle.format(this.manager.locale, 'action.attack.description', typeof this.enemy.name !== 'string' ? this.enemy.name(this.manager.locale) : this.enemy.name, this.owner.inventory.equipments.weapon.item.localName(this.manager.locale));
	}

	public isValid(): boolean {
		return this.owner.inventory.equipments.weapon.cooldown == 0;
	}
}
