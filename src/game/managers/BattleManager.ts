import { MessageActionRow, MessageButton, MessageEmbed } from 'discord.js';

import { UnitEntity, getOne, User, WeaponEntity, SlotWeaponEntity, ItemStack, ItemStorable } from '@RTTRPG/game';
import { Units, Item, Items } from '@RTTRPG/game/contents';
import { Mathf, Canvas, Strings, ANSIStyle } from '@RTTRPG/util';
import SelectManager from '@RTTRPG/game/managers/SelectManager';
import { bundle } from '@RTTRPG/assets';
import { EntityI, ManagerConstructOptions } from '@RTTRPG/@type';
import ItemSelectManager from './ItemSelectManager';
import { codeBlock } from '@discordjs/builders';
import Random from 'random';
import Manager from './Manager';

enum Status {
	DEFAULT,
	EVASION,
	SHIELD
}

abstract class BaseAction {
	public abstract title: string;
	public manager: BattleManager;
	public owner: EntityI;
	public cost: number;

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
		this.owner.stats.energy += this.cost;
	}
	public onAdded(): void {
		this.owner.stats.energy -= this.cost;
	}
}

class AttackAction extends BaseAction {
	private enemy: EntityI;
	public title = 'attack';

	constructor(manager: BattleManager, owner: EntityI, enemy: EntityI, immediate = false) {
		super(manager, owner, 10);
		this.enemy = enemy;

		if (immediate) this.run();
	}

	public async run(): Promise<void> {
		if (this.owner.stats.health <= 0 || this.enemy.stats.health <= 0) return;
		const entity = this.owner.inventory.equipments.weapon;
		if (this.manager.isEvasion(this.enemy)) {
			if (Random.bool()) {
				await this.manager.updateEmbed((this.enemy.id == this.manager.user.id ? '+ ' : '- ') + bundle.format(this.manager.locale, "evasion_successed", typeof this.enemy.name === 'string' ? this.enemy.name : this.enemy.name(this.manager.locale)));
			} else {
				await this.manager.updateEmbed((this.owner.id == this.manager.user.id ? '+ ' : '- ') + bundle.format(this.manager.locale, "evasion_failed", typeof this.enemy.name === 'string' ? this.enemy.name : this.enemy.name(this.manager.locale)));
				await this.manager.updateEmbed((this.owner.id == this.manager.user.id ? '+ ' : '- ') + (entity.item.getWeapon()?.attack(this.enemy, entity, this.manager.locale)) ?? "ERROR");
			}
		}
		else if (this.manager.isShielded(this.enemy)) {
			if (this.enemy.inventory.equipments.shield) this.enemy.inventory.equipments.shield.durability -= this.owner.inventory.equipments.weapon.item.getWeapon().damage;
			await this.manager.updateEmbed((this.enemy.id == this.manager.user.id ? '+ ' : '- ') + bundle.format(this.manager.locale, "shielded", typeof this.enemy.name === 'string' ? this.enemy.name : this.enemy.name(this.manager.locale)))
		} else await this.manager.updateEmbed((this.owner.id == this.manager.user.id ? '+ ' : '- ') + (entity.item.getWeapon()?.attack(this.enemy, entity, this.manager.locale)) ?? "ERROR");

		if (entity.item != Items.punch && entity.item != Items.none) {
			if (entity.durability > 0) entity.durability--;
			if (entity.durability <= 0) {
				await this.manager.updateEmbed(bundle.format(this.manager.locale, 'battle.broken', entity.item.localName(this.manager.locale)));
				const exist = this.owner.inventory.items.find<WeaponEntity>((store): store is WeaponEntity => store instanceof WeaponEntity && store.item == this.owner.inventory.equipments.weapon.item);
				if (exist) {
					this.owner.inventory.items.splice(this.owner.inventory.items.indexOf(exist), 1);
					this.owner.inventory.equipments.weapon = exist;
					await this.manager.updateEmbed(bundle.find(this.manager.locale, "battle.auto_swap"));
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

	public override undo(): void {
		super.undo();
		this.owner.inventory.equipments.weapon.cooldown = 0;
	}

	public override onAdded(): void {
		super.onAdded();
		this.owner.inventory.equipments.weapon.cooldown = this.owner.inventory.equipments.weapon.item.getWeapon().cooldown;
	}
}

class SwapAction extends BaseAction {
	private weapon: Item;
	public title = 'swap';

	constructor(manager: BattleManager, owner: EntityI, weapon: Item, immediate = false) {
		super(manager, owner, 3);
		this.weapon = weapon;

		if (immediate) this.run();
	}

	public async run() {
		if (this.weapon != Items.punch && !this.owner.inventory.items.some(store => store.item == this.weapon)) return this.manager.updateEmbed(bundle.format(this.manager.locale, 'missing_item', this.weapon.localName(this.manager.locale)));

		await this.manager.updateEmbed(bundle.format(this.manager.locale, 'switch_change', this.weapon.localName(this.manager.locale), this.owner.inventory.equipments.weapon.item.localName(this.manager.locale)));
		this.owner.switchWeapon(this.weapon);
		await this.manager.updateEmbed();
	}

	public description(): string {
		return bundle.format(this.manager.locale, 'action.swap.description', this.owner.inventory.equipments.weapon.item.localName(this.manager.locale), this.weapon.localName(this.manager.locale));
	}

	public isValid(): boolean {
		return this.weapon.hasWeapon();
	}
}

class ConsumeAction extends BaseAction {
	private potion: Item;
	private amount: number;
	public title = 'consume';

	constructor(manager: BattleManager, owner: EntityI, potion: Item, amount: number, immediate = false) {
		super(manager, owner, 5);
		this.potion = potion;
		this.amount = amount;

		if (immediate) this.run();
	}

	public async run() {
		const entity = this.owner.inventory.items.find(store => store.item == this.potion);
		if (!entity) return this.manager.updateEmbed(bundle.format(this.manager.locale, 'missing_item', this.potion.localName(this.manager.locale)));
		this.owner.inventory.remove(this.potion, this.amount);
		entity.item.getConsume().consume(this.owner, this.amount);
		await this.manager.updateEmbed(bundle.format(this.manager.locale, 'consume', this.potion.localName(this.manager.locale), this.amount, this.potion.getConsume().buffes.map((b) => b.description(this.owner, this.amount, b, this.manager.locale)).join('\n  ')));
	}

	public description(): string {
		return bundle.format(this.manager.locale, 'action.consume.description', this.potion.localName(this.manager.locale), this.amount);
	}

	public isValid(): boolean {
		return this.potion.hasConsume();
	}
}

class ReloadAction extends BaseAction {
	private ammo: Item;
	private amount: number;
	public title = 'reload';

	constructor(manager: BattleManager, owner: EntityI, ammo: Item, amount: number, immediate = false) {
		super(manager, owner, 1);
		this.ammo = ammo;
		this.amount = amount;

		if (immediate) this.run();
	}

	public async run() {
		const entity = this.owner.inventory.equipments.weapon;
		if (entity instanceof SlotWeaponEntity) {
			const inc = this.ammo.getAmmo()?.itemPerAmmo ?? 1;
			for (let i = 0; i < this.amount; i += inc) entity.ammos.push(this.ammo);
			await this.manager.updateEmbed(bundle.format(this.manager.locale, 'reload', this.ammo.localName(this.manager.locale), this.amount, this.owner.inventory.equipments.weapon.item.localName(this.manager.locale)));
		}
	}

	public description(): string {
		return bundle.format(this.manager.locale, 'action.reload.description', this.ammo.localName(this.manager.locale), this.amount, this.owner.inventory.equipments.weapon.item.localName(this.manager.locale));
	}

	public isValid(): boolean {
		return this.ammo.hasAmmo();
	}
}

class EvaseAction extends BaseAction {
	public title = 'evase';

	constructor(manager: BattleManager, owner: EntityI, immediate = false) {
		super(manager, owner, 1);

		if (immediate) this.run();
	}

	public async run() {
		this.manager.setEvasion(this.owner, true);

		await this.manager.updateEmbed(bundle.format(this.manager.locale, 'evasion_position', typeof this.owner.name === 'string' ? this.owner.name : this.owner.name(this.manager.locale)));
	}

	public description(): string {
		return bundle.find(this.manager.locale, 'action.evase.description');
	}

	public isValid(): boolean {
		return !this.manager.isEvasion(this.owner);
	}
}

class DvaseAction extends BaseAction {
	public title = 'dvase';

	constructor(manager: BattleManager, owner: EntityI, immediate = false) {
		super(manager, owner, 1);

		if (immediate) this.run();
	}

	public async run() {
		this.manager.setEvasion(this.owner, false);

		await this.manager.updateEmbed(bundle.format(this.manager.locale, 'dvasion_position', typeof this.owner.name === 'string' ? this.owner.name : this.owner.name(this.manager.locale)));
	}

	public description(): string {
		return bundle.find(this.manager.locale, 'action.dvase.description');
	}

	public isValid(): boolean {
		return this.manager.isEvasion(this.owner);
	}
}

class ShieldAction extends BaseAction {
	public title = 'shield';

	constructor(manager: BattleManager, owner: EntityI, immediate = false) {
		super(manager, owner, 1);

		if (immediate) this.run();
	}

	public async run() {
		this.manager.setShield(this.owner, true);

		await this.manager.updateEmbed(bundle.format(this.manager.locale, 'shield_position', typeof this.owner.name === 'string' ? this.owner.name : this.owner.name(this.manager.locale)));
	}

	public description(): string {
		return bundle.find(this.manager.locale, 'action.shield.description');
	}

	public isValid(): boolean {
		return !this.manager.isShielded(this.owner);
	}
}

export default class BattleManager extends SelectManager {
	private readonly enemy: UnitEntity;
	private readonly battleLog: string[] = [];
	private readonly comboQueue: string[] = [];
	private readonly actionQueue: BaseAction[] = [];
	private readonly actionQueueManager: Manager;
	private readonly status: Map<EntityI, Status>;
	public readonly user: User;
	private turn: EntityI; //normally, user first
	private totalTurn = 1;

	private readonly comboList: Map<string, () => Promise<unknown>> = new Map<string, () => Promise<unknown>>()
		.set("reload-attack-evase", async () => {
			(this.turn.inventory.equipments.weapon as SlotWeaponEntity).ammos.push(Items.find(0), Items.find(0), Items.find(0));
			await this.updateEmbed(bundle.find(this.locale, "combo.evasing_attack"));
			new AttackAction(this, this.turn, this.turn == this.user ? this.enemy : this.user, true);
		})
		.set("consume-consume-consume", async () => {
			this.turn.stats.health += 5;
			await this.updateEmbed(bundle.find(this.locale, "combo.overeat"));
		});

	public constructor(options: ManagerConstructOptions & { user: User, enemy: UnitEntity, last?: SelectManager }) {
		super(options);
		this.user = options.user;
		this.enemy = options.enemy;
		this.turn = options.user;
		this.status = new Map<EntityI, Status>()
			.set(options.user, Status.DEFAULT)
			.set(this.enemy, Status.DEFAULT);

		this.actionQueueManager = new Manager({ interaction: options.interaction })
			.setEmbeds([new MessageEmbed().setTitle('Action Queue').setDescription("Empty")])
			.setComponents([new MessageActionRow().addComponents([
				new MessageButton()
					.setCustomId('remove')
					.setLabel(bundle.find(this.locale, 'select.undo'))
					.setStyle('DANGER')
					.setDisabled(true)
				])
			])
			.setTriggers('remove', (interaction, manager) => {
				this.actionQueue.pop()?.undo();
				if (this.actionQueue.length == 0 && interaction.component.type == "BUTTON") interaction.component.setDisabled(true);
				this.actionQueueManager.embeds[0].setDescription(this.actionQueue.map<string>(a => a.description()).join('```\n```\n'));
				this.actionQueueManager.send();
			});
		this.actionQueueManager.send();
	}

	public isEvasion(entity: EntityI) {
		return this.status.get(entity) === Status.EVASION;
	}

	public setEvasion(owner: EntityI, evase: boolean) {
		this.status.set(owner, evase ? Status.EVASION : Status.DEFAULT);
	}

	public isShielded(entity: EntityI) {
		return this.status.get(entity) === Status.SHIELD;
	}

	public setShield(owner: EntityI, evase: boolean) {
		this.status.set(owner, evase ? Status.SHIELD : Status.DEFAULT);
	}

	public override async init() {
		this.addButtonSelection('attack', 0, async () => {
			const weapon = this.user.inventory.equipments.weapon;
			if (weapon.cooldown > 0) {
				Manager.newErrorEmbed(this.interaction, bundle.format(this.locale, 'battle.cooldown', weapon.cooldown.toFixed()));
			} else {
				await this.addAction(new AttackAction(this, this.user, this.enemy));
			}
		}, { style: 'PRIMARY', disabled: this.user.inventory.equipments.weapon.cooldown > 0 });

		this.addButtonSelection('evasion', 0, async () => {
			this.addAction(this.isEvasion(this.user) ? new DvaseAction(this, this.user) : new EvaseAction(this, this.user));
		});

		this.addButtonSelection('shield', 0, async () => this.addAction(new ShieldAction(this, this.user)));

		this.addButtonSelection('turn', 0, async () => {
			this.actionQueueManager.components[0].components[0].setDisabled(true);
			this.components.forEach(rows => rows.components.forEach(component => component.setDisabled(true)));
			await this.turnEnd();
		});

		this.addMenuSelection({
			customId: 'swap',
			placeholder: "swap weapon to ...", 
			row: 1,
			callback: (interaction) => {
				if (interaction.isSelectMenu()) {
					const id = interaction.values[0];
					new SwapAction(this, this.user, id == "0" ? Items.punch : this.user.inventory.items.filter(store => store.item.hasWeapon())[Number(id) - 1].item, true);
				}
			},
			list: (<ItemStorable[]>[new WeaponEntity(Items.punch)]).concat(this.user.inventory.items.filter(store => store.item.hasWeapon())),
			reducer: (store, index) => ({
				label: `(${index + 1}) ` + store.item.localName(this.locale) +
					(store instanceof ItemStack ? `${store.amount} ${bundle.find(this.locale, "unit.item")}` : "") +
					(store instanceof WeaponEntity ? `, ${store.cooldown} ${bundle.find(this.locale, 'cooldown')}, ${store.durability} ${bundle.find(this.locale, 'durability')}` : "") +
					(store instanceof SlotWeaponEntity ? `, ${bundle.find(this.locale, 'ammo')} ${store.ammos.length} ${bundle.find(this.locale, 'unit.item')}` : ""),
				value: index.toString()
			})
		});

		this.addMenuSelection({
			customId: 'consume',
			placeholder: "consume ...", 
			row: 2,
			callback: async (interaction) => {
				if (!interaction.isSelectMenu()) return;
				const id = interaction.values[0];
				const entity = this.user.inventory.items.filter(store => store.item.hasConsume())[Number(id)];
				if (entity instanceof ItemStack && entity.amount > 1) {
					ItemSelectManager.start<typeof ItemSelectManager>({ 
						user: this.user,
						item: entity.item,
						interaction: this.interaction,
						callback: async amount => await this.addAction(new ConsumeAction(this, this.user, entity.item, amount))
					});
				} else {
					await this.addAction(new ConsumeAction(this, this.user, entity.item, 1));
				}
			},
			list: this.user.inventory.items.filter(store => store.item.hasConsume()),
			reducer: (store, index) => ({
				label: `(${index + 1}) ${store.item.localName(this.locale)} ${(store instanceof ItemStack ? `${store.amount} ${bundle.find(this.locale, "unit.item")}` : store instanceof WeaponEntity ? `${store.cooldown} ${bundle.find(this.locale, 'cooldown')}, ${store.durability} ${bundle.find(this.locale, 'durability')}` : "")}`,
				value: index.toString()
			})
		});

		this.addMenuSelection({
			customId: 'reload', 
			placeholder: "reload ammo with ...",
			row: 3,
			callback: async (interaction) => {
				if (!interaction.isSelectMenu()) return;
				const id = interaction.values[0];
				const entity = this.user.inventory.items.filter(store => store.item.hasAmmo())[Number(id)];
				if (entity instanceof ItemStack && entity.amount > 1) {
					ItemSelectManager.start<typeof ItemSelectManager>({
						user: this.user, 
						interaction: this.interaction, 
						item: entity.item, 
						callback: async amount => {
							await this.addAction(new ReloadAction(this, this.user, entity.item, amount));
						}
					});
				} else {
					await this.addAction(new ReloadAction(this, this.user, entity.item, 1));
				}
			},
			list: this.user.inventory.items.filter(store => store.item.hasAmmo()),
			reducer: (store, index) => ({
				label: `(${index + 1}) ` + store.item.localName(this.locale) + ` ${(store instanceof ItemStack ? `${store.amount} ${bundle.find(this.locale, "unit.item")}` : store instanceof WeaponEntity ? `${store.cooldown} ${bundle.find(this.locale, 'cooldown')}, ${store.durability} ${bundle.find(this.locale, 'durability')}` : "")}`,
				value: index.toString()
			})
		});

		this.setEmbeds([
			new MessageEmbed()
				.setDescription(bundle.format(this.locale, 'battle.start', this.user.user.username, Units.find(this.enemy.id).localName(this.user)))
			]);
		await this.actionQueueManager.send();
	}

	private async validate() {
		if (this.turn != this.user) return;
		const [attack, evase, shield,] = this.components[0].components;

		attack.setDisabled(this.user.inventory.equipments.weapon.cooldown > 0);
		(evase as MessageButton).setLabel(bundle.find(this.locale, this.isEvasion(this.user) ? 'select.dvasion' : 'select.evasion'));
		shield.setDisabled(!this.user.inventory.equipments.shield);
		const reload = this.components[3].components[0];
		reload.setDisabled(!(this.user.inventory.equipments.weapon instanceof SlotWeaponEntity));
		await this.send();
	}

	private async addAction(action: BaseAction) {
		if (this.turn.stats.energy_max !== 0 && this.turn.stats.energy < action.cost)
			return Manager.newErrorEmbed(this.interaction, bundle.format(this.locale, 'error.low_energy', this.turn.stats.energy, action.cost));

		action.onAdded();
		this.actionQueue.push(action);
		this.actionQueueManager.components[0].components[0].setDisabled(false);
		this.actionQueueManager.embeds[0].setDescription(this.actionQueue.map<string>(a => a.description()).join('```\n```\n'));
		await this.actionQueueManager.send();
		await this.validate();
		await this.updateEmbed();
	}

	private async turnEnd() {
		for (let i = 0; i < this.turn.statuses.length; i++) {
			const status = this.turn.statuses[i];
			await status.status.callback(this.turn, status);
			status.duration--;
			if (status.duration <= 0) this.turn.statuses.splice(this.turn.statuses.findIndex(s => s == status), 1);
		}

		for (; this.actionQueue.length > 0;) {
			const action = this.actionQueue.shift();
			this.actionQueueManager.embeds[0].setDescription(this.actionQueue.map<string>(a => codeBlock(a.description())).join('\n') || "Empty");
			await this.send();
			if (action) {
				if (this.status.get(this.turn) !== Status.DEFAULT) {
					await this.updateEmbed(bundle.find(this.locale, "error.action_status"));
					continue;
				}
				await action.run();

				if (action instanceof BaseAction) this.comboQueue.push(action.title);
				const callback = this.comboList.get(this.comboQueue.join('-'));
				if (callback) {
					this.comboQueue.length = 0;
					await callback();
				}
			}
		}

		this.turn.stats.energy = Math.min(this.turn.stats.energy + 20, this.turn.stats.energy_max);
		this.turn.inventory.equipments.weapon.cooldown = Math.max(0, this.turn.inventory.equipments.weapon.cooldown - 1);

		if (this.turn.stats.health <= 0) {
			await this.battleEnd(this.user);
			return;
		}

		await this.updateEmbed();
		if (this.turn == this.user) {
			this.turn = this.enemy;
			this.setEvasion(this.turn, false);
			await this.enemyTurn();
		} else {
			this.totalTurn++;
			this.turn = this.user;
			this.setEvasion(this.turn, false);
			this.components.forEach(rows => rows.components.forEach(component => component.setDisabled(false)));
			await this.updateEmbed(bundle.format(this.locale, "battle.turnend", this.totalTurn));
		}
	}

	private async enemyTurn() {
		if (this.enemy.inventory.equipments.weapon.item != Items.none) await this.addAction(new AttackAction(this, this.enemy, this.user));
		this.turnEnd();
	}

	public async updateEmbed(log?: string) {
		if (log) {
			if (this.battleLog.length > 5) this.battleLog.shift();
			this.battleLog.push(log);
		}
		this.embeds[0].setFields([
			{
				name: this.user.user.username + (this.turn == this.user ? `   ${this.totalTurn} ` + bundle.find(this.locale, "turn") : "") + (this.isEvasion(this.user) ? `   ${bundle.find(this.locale, 'evasion')}` : ""),
				value:
					`**${bundle.find(this.locale, 'health')}**: ${this.user.stats.health}/${this.user.stats.health_max}\n${Canvas.unicodeProgressBar(this.user.stats.health, this.user.stats.health_max)}` +
					`\n\n**${bundle.find(this.locale, 'energy')}**: ${this.user.stats.energy}/${this.user.stats.energy_max}\n${Canvas.unicodeProgressBar(this.user.stats.energy, this.user.stats.energy_max)}` +
					`\n\n**${bundle.find(this.locale, 'weapon')}**: ${this.user.inventory.equipments.weapon.item.localName(this.locale)}(${this.user.inventory.equipments.weapon.cooldown}), ${bundle.find(this.locale, "durability")} ${this.user.inventory.equipments.weapon.durability ?? "0"}` +
					(this.user.inventory.equipments.weapon instanceof SlotWeaponEntity ? `, ${bundle.find(this.locale, 'ammo')} ${this.user.inventory.equipments.weapon.ammos.length} ${bundle.find(this.locale, 'unit.item')}` : "") +
					(this.user.inventory.equipments.shield ? `\n\n**${bundle.find(this.locale, 'shield')}**: ${this.user.inventory.equipments.shield.item.localName(this.locale)}, ${bundle.find(this.locale, "durability")} ${this.user.inventory.equipments.shield.durability}` : "") +
					(this.user.statuses.length > 0 ? `\n**${bundle.find(this.locale, 'status')}**\n${this.user.statuses.map(status => `${status.status.localName(this.locale)}: ${status.duration.toFixed()} ${bundle.find(this.locale, "turn")}`).join('\n')}` : ''),
				inline: true
			},
			{
				name: this.enemy.getUnit().localName(this.locale) + (this.turn == this.enemy ? `   ${this.totalTurn} ` + bundle.find(this.locale, "turn") : "") + (this.isEvasion(this.enemy) ? `   ${bundle.find(this.locale, 'evasion')}` : ""),
				value:
					`**${bundle.find(this.locale, 'health')}**: ${this.enemy.stats.health}/${this.enemy.stats.health_max}\n${Canvas.unicodeProgressBar(this.enemy.stats.health, this.enemy.stats.health_max)}` +
					`\n\n**${bundle.find(this.locale, 'energy')}**: ${this.enemy.stats.energy}/${this.enemy.stats.energy_max}\n${Canvas.unicodeProgressBar(this.enemy.stats.energy, this.enemy.stats.energy_max)}` +
					`\n\n**${bundle.find(this.locale, 'weapon')}**: ${this.enemy.inventory.equipments.weapon.item.localName(this.locale)}(${this.enemy.inventory.equipments.weapon.cooldown || 0}), ${bundle.find(this.locale, "durability")} ${this.enemy.inventory.equipments.weapon.durability ?? "0"}` +
					(this.enemy.inventory.equipments.weapon instanceof SlotWeaponEntity ? `, ${bundle.find(this.locale, 'ammo')} ${this.enemy.inventory.equipments.weapon.ammos.length} ${bundle.find(this.locale, 'unit.item')}` : "") +
					(this.enemy.inventory.equipments.shield ? `\n\n**${bundle.find(this.locale, 'shield')}**: ${this.enemy.inventory.equipments.shield.item.localName(this.locale)}, ${bundle.find(this.locale, "durability")} ${this.enemy.inventory.equipments.shield.durability}` : "") +
					(this.enemy.statuses.length > 0 ? `\n**${bundle.find(this.locale, 'status')}**\n${this.enemy.statuses.map(status => `${status.status.localName(this.locale)}: ${status.duration.toFixed()} ${bundle.find(this.locale, "turn")}`).join('\n')}` : ''),
				inline: true
			},
			{
				name: 'Logs',
				value: this.battleLog.map(log => codeBlock('diff', log)).join('') || "Empty"
			}
		]);
		await this.send().catch(console.log);
	}

	private async battleEnd(user: User) {
		this.setComponents([]);
		this.actionQueueManager.remove();

		if (this.enemy.stats.health <= 0) {
			const unit = Units.find(this.enemy.id);
			const items: { item: Item, amount: number }[] = [];

			//전투 보상은 최소 1개, 최대 적 레벨의 4배만큼의 랜덤한 아이템
			for (let i = 0; i < Math.floor(Mathf.range(unit.level, unit.level * 4)) + 1; i++) {
				const item = getOne(Items.items.filter((i) => i.dropOnBattle));
				const obj = items.find((i) => i.item == item);
				if (obj) obj.amount++;
				else items.push({ item, amount: 1 });
			}

			await this.updateEmbed('+ ' + (this.enemy.stats.health < 0 ? bundle.find(this.locale, 'battle.overkill') + ' ' : '') + bundle.format(this.locale, 'battle.win', this.enemy.stats.health));
			this.embeds[0].addField(
				'Battle End',
				Strings.color(
					bundle.format(this.locale, 'battle.result',
						user.exp,
						user.exp += unit.level * (1 + unit.ratio) * 10,
						items.map((i) => `${i.item.localName(user)} +${i.amount} ${bundle.find(this.locale, 'unit.item')}`).join('\n')
					) + '\n' + items.map((i) => user.giveItem(i.item)).filter((e) => e).join('\n'),
					[ANSIStyle.BLUE])
			);
			await this.send();
		} else if (user.stats.health <= 0) {
			await this.updateEmbed('- ' + bundle.format(this.locale, 'battle.lose', user.stats.health));
		}
		this.addRemoveButton();
		await this.send();
	}
}