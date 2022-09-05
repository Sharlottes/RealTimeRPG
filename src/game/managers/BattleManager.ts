import { MessageButton, MessageEmbed, MessageSelectMenu } from 'discord.js';

import { UnitEntity, getOne, WeaponEntity, SlotWeaponEntity, ItemStack, ItemStorable } from '@RTTRPG/game';
import { Item, Items } from '@RTTRPG/game/contents';
import { Mathf, Canvas, Strings, ANSIStyle } from '@RTTRPG/util';
import SelectManager from '@RTTRPG/game/managers/SelectManager';
import { bundle } from '@RTTRPG/assets';
import { EntityI, SelectManagerConstructOptions } from '@RTTRPG/@type';
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
		if(this.bloody) this.owner.stats.health += this.cost; 
		else this.owner.stats.energy += this.cost;
	}
	public onAdded(): void {
		if(this.owner.stats.energy < this.cost) {
			this.owner.stats.health -= this.cost;
			this.bloody = true;
			Manager.newTextEmbed(this.manager.interaction, bundle.find(this.manager.locale, 'alert.bloody_action'), bundle.find(this.manager.locale, 'alert'));
		} else {
			this.owner.stats.energy -= this.cost;
		}
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
		await this.manager.update();
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
		if (!entity) {
			await this.manager.updateLog(bundle.format(this.manager.locale, 'missing_item', this.potion.localName(this.manager.locale))).update();
			return;
		}
		this.owner.inventory.remove(this.potion, this.amount);
		entity.item.getConsume().consume(this.owner, this.amount);
		await this.manager.updateLog(bundle.format(this.manager.locale, 'consume', 
			this.potion.localName(this.manager.locale), 
			this.amount, 
			this.potion.getConsume().buffes.map((b) => b.description(this.owner, this.amount, b, this.manager.locale)).join('\n  ')
		)).update();
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
			await this.manager.updateLog(bundle.format(this.manager.locale, 'reload', 
				this.ammo.localName(this.manager.locale), 
				this.amount, 
				this.owner.inventory.equipments.weapon.item.localName(this.manager.locale)
			)).update();
		}
	}

	public description(): string {
		return bundle.format(this.manager.locale, 'action.reload.description', 
			this.ammo.localName(this.manager.locale), 
			this.amount, 
			this.owner.inventory.equipments.weapon.item.localName(this.manager.locale)
		);
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

class DvaseAction extends BaseAction {
	public title = 'dvase';

	constructor(manager: BattleManager, owner: EntityI, immediate = false) {
		super(manager, owner, 1);

		if (immediate) this.run();
	}

	public async run() {
		this.manager.setEvasion(this.owner, false);

		await this.manager.updateLog(bundle.format(this.manager.locale, 'dvasion_position', 
			typeof this.owner.name === 'string' ? this.owner.name : this.owner.name(this.manager.locale)
		)).update();
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

		await this.manager.updateLog(bundle.format(this.manager.locale, 'shield_position', 
			typeof this.owner.name === 'string' ? this.owner.name : this.owner.name(this.manager.locale)
		)).update();
	}

	public description(): string {
		return bundle.find(this.manager.locale, 'action.shield.description');
	}

	public isValid(): boolean {
		return !this.manager.isShielded(this.owner);
	}
}

export default class BattleManager extends SelectManager {
	private readonly mainEmbed: MessageEmbed;
	private readonly actionEmbed: MessageEmbed;
	private readonly comboQueue: string[] = [];
	private readonly actionQueue: BaseAction[] = [];
	private readonly status: Map<EntityI, Status>;

	public readonly enemy: UnitEntity;
	public turn: EntityI; //normally, user first

	private totalTurn = 1;

	private readonly comboList: Map<string, () => Promise<void>> = new Map<string, () => Promise<void>>()
		.set("reload-attack-evase", async () => {
			(this.turn.inventory.equipments.weapon as SlotWeaponEntity).ammos.push(Items.find(0), Items.find(0), Items.find(0));
			await this.updateLog(bundle.find(this.locale, "combo.evasing_attack")).update();
			new AttackAction(this, this.turn, this.turn == this.user ? this.enemy : this.user, true);
		})
		.set("consume-consume-consume", async () => {
			this.turn.stats.health += 5;
			await this.updateLog(bundle.find(this.locale, "combo.overeat")).update();
		});

	public constructor(options: SelectManagerConstructOptions & { enemy: UnitEntity }) {
		super(options);
		this.enemy = options.enemy;
		this.turn = options.user;
		this.status = new Map<EntityI, Status>()
			.set(options.user, Status.DEFAULT)
			.set(this.enemy, Status.DEFAULT);

		this.mainEmbed = new MessageEmbed().setTitle("Battle Status");
		this.actionEmbed = new MessageEmbed().setTitle('Action Queue').setDescription("Empty");
	}

	public override async init() {
		super.init();

		this.setContent(bundle.format(this.locale, 'battle.start', this.user.user.username, this.enemy.type.localName(this.user)));
		this.setEmbeds([ this.mainEmbed, this.actionEmbed ]);
	    this.updateLog(bundle.format(this.locale, "battle.turnend", this.totalTurn));
		this.updateBar();

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
			this.components[4].components[0].setDisabled(true);
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
						item: entity,
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
						item: entity, 
						interaction: this.interaction, 
						callback: amount => this.addAction(new ReloadAction(this, this.user, entity.item, amount))
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

		this.addButtonSelection('undo', 4, () => {
			this.actionQueue.pop()?.undo();
			this.actionEmbed.setDescription(this.actionQueue.map<string>(a => codeBlock(a.description())).join(''));
			this.validate();
			this.update();
		}, {
			style: 'DANGER',
			disabled: true
		})

		this.validate();
	}

	isEvasion = (entity: EntityI) => this.status.get(entity) === Status.EVASION
	setEvasion = (owner: EntityI, evase: boolean) => this.status.set(owner, evase ? Status.EVASION : Status.DEFAULT)
	isShielded = (entity: EntityI) => this.status.get(entity) === Status.SHIELD
	setShield = (owner: EntityI, evase: boolean) => this.status.set(owner, evase ? Status.SHIELD : Status.DEFAULT)

	/**
	 * 모든 컴포넌트에 대해 유효성 검사를 합니다.
	 */
	validate() {
		//자신의 턴일때만 활성화
		this.components.forEach(row => row.components.forEach(component => component.setDisabled(this.turn != this.user)));
		if(this.turn != this.user) return;
		
		const [ 
			{ components: [ attack, evase, shield ] },,, 
			{ components: [ reload ] }, 
			{ components: [ actionCancel ] } 
		] = this.components;

		//엑션이 있으면 취소버튼 활성
		actionCancel.setDisabled(this.actionQueue.length == 0);

		//쿨다운이 없으면 공격버튼 활성
		attack.setDisabled(this.user.inventory.equipments.weapon.cooldown > 0);

		//방패가 있으면 방어버튼 활성
		//TODO: 방어 시스템 구체화
		shield.setDisabled(!this.user.inventory.equipments.shield);

		//장전 가능한 아이템이 있으면 장전메뉴 활성
		reload.setDisabled(!(this.user.inventory.equipments.weapon instanceof SlotWeaponEntity));

		//회피 on/off
		(evase as MessageButton).setLabel(bundle.find(this.locale, this.isEvasion(this.user) ? 'select.dvasion' : 'select.evasion'));
	}

	private async addAction(action: BaseAction) {
		if (this.turn.stats.energy_max !== 0 && this.turn.stats.energy < action.cost) {
			Manager.newErrorEmbed(this.interaction, bundle.format(this.locale, 'error.low_energy', this.turn.stats.energy, action.cost));
			return;
		}
		
		/*
		TODO: action valid 함수 만들기
		if (this.status.get(this.user) !== Status.DEFAULT) {
			Manager.newErrorEmbed(this.interaction, bundle.find(this.locale, "error.action_status"));
			return;
		}
		*/

		action.onAdded();
		this.actionQueue.push(action);
		this.actionEmbed.setDescription(this.actionQueue.map<string>(a => codeBlock(a.description())).join(''));
		this.updateBar();
		this.validate();
		await this.update();
	}

	private async turnEnd() {
		//쿨다운 감소
		this.turn.inventory.equipments.weapon.cooldown = Math.max(0, this.turn.inventory.equipments.weapon.cooldown - 1);

		//버프/디버프 효과
		for (const status of this.turn.statuses) {
			status.status.callback(this.turn, status);
			status.duration--;
			if (status.duration <= 0) this.turn.statuses.splice(this.turn.statuses.findIndex(s => s == status), 1);
		}

		//엑션/콤보 실행
		while (this.actionQueue.length > 0) {
			const action = this.actionQueue.shift();
			this.actionEmbed.setDescription(this.actionQueue.map<string>(a => codeBlock(a.description())).join(''));
			await this.update();
			if (!action) continue;
			await action.run();

			this.comboQueue.push(action.title);
			const callback = this.comboList.get(this.comboQueue.join('-'));
			if (callback) {
				this.comboQueue.length = 0;
				await callback();
			}
		}

		//둘 중 하나가 죽으면 전투 끝
		if (this.user.stats.health <= 0 || this.enemy.stats.health <= 0) {
			await this.battleEnd();
			return;
		}
		
		if (this.turn == this.user) {
			this.turn = this.enemy;
			this.status.set(this.enemy, Status.DEFAULT);
			if (this.enemy.inventory.equipments.weapon.item != Items.none) await this.addAction(new AttackAction(this, this.enemy, this.user));
			this.turnEnd();
			return;
		}
		this.totalTurn++;
		this.turn = this.user;
		this.status.set(this.user, Status.DEFAULT);

		this.updateBar();
		this.validate();
		await this.updateLog(bundle.format(this.locale, "battle.turnend", this.totalTurn)).update();
	}

	public updateLog(log: string): this {
		this.addContent(codeBlock('diff', log));
		return this;
	}

	public updateBar() {
		this.mainEmbed.setFields([
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
				name: this.enemy.type.localName(this.locale) + (this.turn == this.enemy ? `   ${this.totalTurn} ` + bundle.find(this.locale, "turn") : "") + (this.isEvasion(this.enemy) ? `   ${bundle.find(this.locale, 'evasion')}` : ""),
				value:
					`**${bundle.find(this.locale, 'health')}**: ${this.enemy.stats.health}/${this.enemy.stats.health_max}\n${Canvas.unicodeProgressBar(this.enemy.stats.health, this.enemy.stats.health_max)}` +
					`\n\n**${bundle.find(this.locale, 'energy')}**: ${this.enemy.stats.energy}/${this.enemy.stats.energy_max}\n${Canvas.unicodeProgressBar(this.enemy.stats.energy, this.enemy.stats.energy_max)}` +
					`\n\n**${bundle.find(this.locale, 'weapon')}**: ${this.enemy.inventory.equipments.weapon.item.localName(this.locale)}(${this.enemy.inventory.equipments.weapon.cooldown || 0}), ${bundle.find(this.locale, "durability")} ${this.enemy.inventory.equipments.weapon.durability ?? "0"}` +
					(this.enemy.inventory.equipments.weapon instanceof SlotWeaponEntity ? `, ${bundle.find(this.locale, 'ammo')} ${this.enemy.inventory.equipments.weapon.ammos.length} ${bundle.find(this.locale, 'unit.item')}` : "") +
					(this.enemy.inventory.equipments.shield ? `\n\n**${bundle.find(this.locale, 'shield')}**: ${this.enemy.inventory.equipments.shield.item.localName(this.locale)}, ${bundle.find(this.locale, "durability")} ${this.enemy.inventory.equipments.shield.durability}` : "") +
					(this.enemy.statuses.length > 0 ? `\n**${bundle.find(this.locale, 'status')}**\n${this.enemy.statuses.map(status => `${status.status.localName(this.locale)}: ${status.duration.toFixed()} ${bundle.find(this.locale, "turn")}`).join('\n')}` : ''),
				inline: true
			}
		]);
	}

	private async battleEnd() {
		this.setEmbeds([ this.mainEmbed ]);
		this.updateBar();
		if (this.enemy.stats.health <= 0) {
			const unit = this.enemy.type;
			const items: { item: Item, amount: number }[] = [];

			//전투 보상은 최소 1개, 최대 적 레벨의 4배만큼의 랜덤한 아이템
			for (let i = 0; i < Math.floor(Mathf.range(unit.level, unit.level * 4)) + 1; i++) {
				const item = getOne(Items.items.filter((i) => i.dropOnBattle));
				const obj = items.find((i) => i.item == item);
				if (obj) obj.amount++;
				else items.push({ item, amount: 1 });
			}

			this.updateLog('+ ' + (this.enemy.stats.health < 0 ? bundle.find(this.locale, 'battle.overkill') + ' ' : '') + bundle.format(this.locale, 'battle.win', this.enemy.stats.health));
			this.mainEmbed.addField(
				'Battle End',
				Strings.color(
					bundle.format(this.locale, 'battle.result',
						this.user.exp,
						this.user.exp += unit.level * (1 + unit.ratio) * 10,
						items.map((i) => `${i.item.localName(this.locale)} +${i.amount} ${bundle.find(this.locale, 'unit.item')}`).join('\n')
					) + '\n' + items.map((i) => this.user.giveItem(i.item)).filter((e) => e).join('\n'),
					[ANSIStyle.BLUE])
			);
		} else if (this.user.stats.health <= 0) {
			this.updateLog('- ' + bundle.format(this.locale, 'battle.lose', this.user.stats.health));
			//TODO: 패배 부분 구현하기
		}
		this.endManager(15 * 1000);
	}
}