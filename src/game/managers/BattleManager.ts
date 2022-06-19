import { CommandInteraction, MessageActionRow, MessageButton, MessageEmbed, MessageSelectMenu, MessageSelectOptionData } from 'discord.js';

import { UnitEntity, getOne, save, findMessage, User, WeaponEntity, SlotWeaponEntity, ItemStack } from '@RTTRPG/game';
import { Units, Item, Items } from '@RTTRPG/game/contents';
import { Mathf, Canvas, Strings, ANSIStyle } from '@RTTRPG/util';
import { SelectManager, BaseManager } from '@RTTRPG/game/managers';
import { bundle } from '@RTTRPG/assets';
import { EntityI } from '@RTTRPG/@type';
import { BaseEmbed } from '../../modules/BaseEmbed';
import ItemSelectManager from './ItemSelectManager';
import AmmoTag from '../contents/tags/AmmoTag';
import { codeBlock } from '@discordjs/builders';
import Random from 'random';

enum Status {
	DEFAULT,
	EVASION
}

interface ActionI {
	name: string;
	manager: BattleManager;
	run(): Promise<void>;
	description(): string;
}

abstract class BaseAction implements ActionI {
  public name = 'base Action';
  public manager: BattleManager;
  public owner: EntityI;
  public cost: number;
  
  constructor(manager: BattleManager, owner: EntityI, cost: number, immediate = false) {
    this.manager = manager;
    this.owner = owner;
    this.cost = cost;

		if(immediate) this.run();
  }

	abstract run(): Promise<void>;
	abstract description(): string;
}

class AttackAction extends BaseAction { 
	private enemy: EntityI;
	
	constructor(manager: BattleManager, owner: EntityI, enemy: EntityI, immediate = false) {
		super(manager, owner, 10);
		this.name = 'attack';
		this.enemy = enemy;

		if(immediate) this.run();
	}
	
	public async run() {
		if(this.owner.stats.health <= 0 || this.enemy.stats.health <= 0) return;
		const entity = this.owner.inventory.equipments.weapon;
		if(this.manager.isEvasion(this.enemy)) { 
			if(Random.bool()) await this.manager.updateEmbed((this.owner.id == this.manager.user.id?'- ':'+ ')+bundle.format(this.manager.locale, "evasion_successed", typeof this.enemy.name === 'string' ? this.enemy.name : this.enemy.name(this.manager.locale)));
			else {
				await this.manager.updateEmbed((this.owner.id == this.manager.user.id?'+ ':'- ')+bundle.format(this.manager.locale, "evasion_failed", typeof this.enemy.name === 'string' ? this.enemy.name : this.enemy.name(this.manager.locale)));
		 		await this.manager.updateEmbed((this.owner.id == this.manager.user.id?'+ ':'- ')+(entity.item.getWeapon()?.attack(this.enemy, entity, this.manager.locale))??"ERROR");
			}
		}
		else await this.manager.updateEmbed((this.owner.id == this.manager.user.id?'+ ':'- ')+(entity.item.getWeapon()?.attack(this.enemy, entity, this.manager.locale))??"ERROR");
	
		if(entity.item != Items.punch && entity.item != Items.none) {
			if(entity.durability > 0) entity.durability--;
			if(entity.durability <= 0) {
				await this.manager.updateEmbed(bundle.format(this.manager.locale, 'battle.broken', entity.item.localName(this.manager.locale)));
				const exist = this.owner.inventory.items.find<WeaponEntity>((store): store is WeaponEntity => store instanceof WeaponEntity && store.item == this.owner.inventory.equipments.weapon.item);
				if(exist) {
					this.owner.inventory.items.splice(this.owner.inventory.items.indexOf(exist), 1);
					this.owner.inventory.equipments.weapon = exist;
					await this.manager.updateEmbed(bundle.find(this.manager.locale, "battle.auto_swap"));
				} 
				else this.owner.inventory.equipments.weapon = new WeaponEntity(Items.punch);
			}
		}
	}

	public description(): string {
		return bundle.format(this.manager.locale, 'action.attack.description', typeof this.owner.name !== 'string' ? this.owner.name(this.manager.locale) : this.owner.name, typeof this.enemy.name !== 'string' ? this.enemy.name(this.manager.locale) : this.enemy.name, this.owner.inventory.equipments.weapon.item.localName(this.manager.locale));
	}
}

class SwapAction extends BaseAction {
	private weapon: Item;

	constructor(manager: BattleManager, owner: EntityI, weapon: Item, immediate = false) {
		if(!weapon.hasWeapon()) throw 'not a weapon';
		super(manager, owner, 3);
		this.weapon = weapon;
		
		if(immediate) this.run();
	}

	public async run() {
		const entity = this.owner.inventory.items.find(store => store.item == this.weapon);
		if(!entity) return this.manager.updateEmbed(bundle.format(this.manager.locale, 'missing_item', this.weapon.localName(this.manager.locale)));
		
	  await this.manager.updateEmbed(bundle.format(this.manager.locale, 'switch_change', this.weapon.localName(this.manager.locale), this.owner.inventory.equipments.weapon.item.localName(this.manager.locale)));
		this.owner.switchWeapon(this.weapon);
		await this.manager.updateEmbed();
	}

	public description(): string {
		return bundle.format(this.manager.locale, 'action.swap.description', this.owner.inventory.equipments.weapon.item.localName(this.manager.locale), this.weapon.localName(this.manager.locale));
	}
}

class ConsumeAction extends BaseAction {
	private potion: Item;
	private amount: number;

	constructor(manager: BattleManager, owner: EntityI, potion: Item, amount: number, immediate = false) {
		if(!potion.hasConsume()) throw 'not a consume';
		super(manager, owner, 5);
		this.potion = potion;
		this.amount = amount;
		
		if(immediate) this.run();
	}

	public async run() {
		const entity = this.owner.inventory.items.find(store => store.item == this.potion);
		if(!entity) return this.manager.updateEmbed(bundle.format(this.manager.locale, 'missing_item', this.potion.localName(this.manager.locale)));
		this.owner.inventory.remove(this.potion, this.amount);
		entity.item.getConsume().consume(this.owner, this.amount);
		await this.manager.updateEmbed(bundle.format(this.manager.locale, 'consume', this.potion.localName(this.manager.locale), this.amount, this.potion.getConsume().buffes.map((b) => b.description(this.owner, this.amount, b, this.manager.locale)).join('\n  ')));
	}

	public description(): string {
		return bundle.format(this.manager.locale, 'action.consume.description', this.potion.localName(this.manager.locale), this.amount);
	}
}

class ReloadAction extends BaseAction {
	private ammo: Item;
	private amount: number;

	constructor(manager: BattleManager, owner: EntityI, ammo: Item, amount: number, immediate = false) {
		super(manager, owner, 1);
		this.ammo = ammo;
		this.amount = amount;
		
		if(immediate) this.run();
	}

	public async run() {
		const entity = this.owner.inventory.equipments.weapon;
		if(entity instanceof SlotWeaponEntity) {
			const inc = this.ammo.tags.find<AmmoTag>((tag): tag is AmmoTag => tag instanceof AmmoTag)?.itemPerAmmo ?? 1;
			for(let i = 0; i < this.amount; i += inc) entity.ammos.push(this.ammo);	
			await this.manager.updateEmbed(bundle.format(this.manager.locale, 'reload', this.ammo.localName(this.manager.locale), this.amount, this.owner.inventory.equipments.weapon.item.localName(this.manager.locale)));
		}
	}
	
	public description(): string {
		return bundle.format(this.manager.locale, 'action.reload.description', this.ammo.localName(this.manager.locale), this.amount, this.owner.inventory.equipments.weapon.item.localName(this.manager.locale));
	}
}

class EvaseAction extends BaseAction {
	constructor(manager: BattleManager, owner: EntityI, immediate = false) {
		super(manager, owner, 1);
		
		if(immediate) this.run();
	}

	public async run() {
			this.manager.status.set(this.owner, Status.EVASION);

			await this.manager.updateEmbed(bundle.format(this.manager.locale, 'evasion_position', typeof this.owner.name === 'string' ? this.owner.name : this.owner.name(this.manager.locale)));
	}
	
	public description(): string {
		return bundle.find(this.manager.locale, 'action.evase.description');
	}
}

export default class BattleManager extends SelectManager {
	private enemy: UnitEntity;
	private battleLog: string[] = [];
	private actionQueue: ActionI[] = [];
	private actionBuilder: BaseEmbed;
	private turn: EntityI = this.user; //normally, user first
	private totalTurn = 1;
	public status: Map<EntityI, Status>;

	//ETC VIOLATION
	//TODO: make selection page widget
	private consumePage = 0;
	private swapPage = 0;
	private reloadPage = 0;

  public constructor(user: User, interaction: CommandInteraction, enemy: UnitEntity, builder = findMessage(interaction.id).builder, last?: SelectManager) {
    super(user, interaction, builder, last);
		this.enemy = enemy;
		this.status = new Map<EntityI, Status>().set(this.user, Status.DEFAULT).set(this.enemy, Status.DEFAULT);
		this.actionBuilder = new BaseEmbed(interaction, false).setPages(new MessageEmbed().setTitle('Action Queue'))
			.addComponents([new MessageActionRow().addComponents([new MessageButton().setCustomId('remove').setLabel(bundle.find(this.locale, 'select.undo')).setStyle('DANGER').setDisabled(true)])])
			.addTriggers([{name: 'remove', callback: (componentInteraction, components)=>{
				this.actionQueue.pop();
				if(this.actionQueue.length == 0) components.setDisabled(true);
				this.actionBuilder.setDescription(this.actionQueue.map<string>(a=>a.description()).join('```\n```\n')).rerender();
			}}]);
		if(new.target === BattleManager) this.init();
	}

	public isEvasion(entity: EntityI) {
	 	return this.status.get(entity) === Status.EVASION;
	}

	protected override async init() {
		this.addButtonSelection('attack', 0, async () => {
			const weapon = this.user.inventory.equipments.weapon;
			if(weapon.cooldown > 0) {
				BaseManager.newErrorEmbed(this.user, this.interaction, bundle.format(this.locale, 'battle.cooldown', weapon.cooldown.toFixed()));
			}
			else {
				weapon.cooldown = this.user.inventory.equipments.weapon.item.getWeapon().cooldown;
				await this.addAction(new AttackAction(this, this.user, this.enemy));
			}
		}, {style: 'PRIMARY', disabled: this.user.inventory.equipments.weapon.cooldown > 0});

		this.addButtonSelection('evasion', 0, async () => {
			this.addAction(new EvaseAction(this, this.user))
		});
		this.addButtonSelection('turn', 0, async () => {
			this.actionBuilder.getComponents()[0].components[0].setDisabled(true);

			this.builder.getComponents()?.forEach(rows=>rows.components.forEach(component=>component.setDisabled(true)));
			if(await this.turnEnd()) return;
			this.builder.getComponents()?.forEach(rows=>rows?.components.forEach(component=>component.setDisabled(false)));

			if(this.builder.getComponents()[0]) {
				const button = this.builder.getComponents()[0].components[0];
				button.setDisabled(this.user.inventory.equipments.weapon.cooldown > 0);
				this.builder.updateComponents(button);
			}

			await this.updateEmbed();
		});
		this.addMenuSelection('swap', 1, async (user, row, interactionCallback, component) => {
			if (interactionCallback.isSelectMenu()) {
				const id = interactionCallback.values[0];
				switch(id) {
				  case '-1': {
	  				if(this.swapPage == 0) BaseManager.newErrorEmbed(this.user, this.interaction, bundle.find(this.locale, "error.first_page"));
	  				else this.swapPage--;
		  			break;
	  			}
				  case '-2': {
	  				if(this.swapPage+1 > Math.floor(this.user.inventory.items.length/8)) BaseManager.newErrorEmbed(this.user, this.interaction, bundle.find(this.locale, "error.last_page"));
  					else this.swapPage++;
	  				break;
	  			}
				  default: {
						const entity = this.user.inventory.items[Number(id)];
						new SwapAction(this, user, entity.item, true);
	  			}
				}
				
				(component as MessageSelectMenu).setOptions(this.user.inventory.items.reduce<MessageSelectOptionData[]>((a, store, index)=>{
					if(store.item.hasWeapon()) {
						if(index < this.swapPage*8 || index > (this.swapPage + 1) * 8) return a;
						else return [...a, {
							label: store.item.localName(this.locale),
							value: index.toString()
						}]
					}
					else return a;
				}, [{label: bundle.find(this.locale, 'prev')+", "+this.swapPage, value: '-1'}]).concat({label: bundle.find(this.locale, 'next'), value: '-2'}));
				this.builder.updateComponents(component).rerender();
			}
		},
		{
			placeholder: 'swap weapon to ...',
			options: this.user.inventory.items.reduce<MessageSelectOptionData[]>((a, store, index)=>{
				if(store.item.hasWeapon()) {
					if(index < this.swapPage*8 || index > (this.swapPage + 1) * 8) return a;
					else return [...a, {
						label: store.item.localName(this.locale),
						value: index.toString()
					}]
				 }
				else return a;
			}, [{label: bundle.find(this.locale, 'prev')+", "+this.swapPage, value: '-1'}]).concat({label: bundle.find(this.locale, 'next'), value: '-2'})
		});
		this.addMenuSelection('consume', 2, async (user, row, interactionCallback, component) => {
			if (interactionCallback.isSelectMenu()) {
				const id = interactionCallback.values[0];
				switch(id) {
				  case '-1': {
	  				if(this.consumePage == 0) BaseManager.newErrorEmbed(this.user, this.interaction, bundle.find(this.locale, "error.first_page"));
	  				else this.consumePage--;
		  			break;
	  			}
				  case '-2': {
	  				if(this.consumePage+1 > Math.floor(this.user.inventory.items.length/8)) 
							BaseManager.newErrorEmbed(this.user, this.interaction, bundle.find(this.locale, "error.last_page"));
  					else this.consumePage++;
	  				break;
	  			}
				  default: {
						const entity = this.user.inventory.items[Number(id)];
						const potion = entity.item;
						if(entity instanceof ItemStack && entity.amount > 1) new ItemSelectManager(this.user, this.interaction, potion, async amount => {
							await this.addAction(new ConsumeAction(this, user, potion, amount));
						});
						else await this.addAction(new ReloadAction(this, user, entity.item, 1));
	  			}
				}

				(component as MessageSelectMenu).setOptions(this.user.inventory.items.reduce<MessageSelectOptionData[]>((a, store, index)=>{
					if(store.item.hasConsume()) {
						if(index < this.swapPage*8 || index > (this.swapPage + 1) * 8) return a;
						else return [...a, {
							label: store.item.localName(this.locale),
							value: index.toString()
						}]
					}
					else return a;
				}, [{label: bundle.find(this.locale, 'prev')+", "+this.consumePage, value: '-1'}]).concat({label: bundle.find(this.locale, 'next'), value: '-2'}));
				this.builder.updateComponents(component).rerender();
			}
		},
		{
			placeholder: 'consume ...',
			options: this.user.inventory.items.reduce<MessageSelectOptionData[]>((a, store, index)=>{
				if(store.item.hasConsume()) {
					if(index < (this.consumePage-1)*8 || index > this.consumePage*8) return a;
					else return [...a, {
						label: store.item.localName(this.locale),
						value: store.item.id.toString()+'.'+index
					}]
				 }
				else return a;
			}, [{label: bundle.find(this.locale, 'prev')+", "+this.consumePage, value: '-1'}]).concat({label: bundle.find(this.locale, 'next'), value: '-2'})
		});
		this.addMenuSelection('reload', 3, async (user, row, interactionCallback, component) => {
			if (interactionCallback.isSelectMenu()) {
				const id = interactionCallback.values[0];
				switch(id) {
				  case '-1': {
	  				if(this.reloadPage == 0) BaseManager.newErrorEmbed(this.user, this.interaction, bundle.find(this.locale, "error.first_page"));
	  				else this.reloadPage--;
		  			break;
	  			}
				  case '-2': {
	  				if(this.reloadPage+1 > Math.floor(this.user.inventory.items.length/8)) 
							BaseManager.newErrorEmbed(this.user, this.interaction, bundle.find(this.locale, "error.last_page"));
  					else this.reloadPage++;
	  				break;
	  			}
				  default: {
						const entity = this.user.inventory.items[Number(id)];
						if(entity instanceof ItemStack && entity.amount > 1) new ItemSelectManager(this.user, this.interaction, entity.item, async amount => {
							await this.addAction(new ReloadAction(this, user, entity.item, amount));
						});
						else await this.addAction(new ReloadAction(this, user, entity.item, 1));
	  			}
				}

				(component as MessageSelectMenu).setOptions(this.user.inventory.items.reduce<MessageSelectOptionData[]>((a, store, index)=>{
					if(store.item.tags.some(tag=>tag instanceof AmmoTag)) {
						if(index < this.reloadPage*8 || index > (this.reloadPage + 1) * 8) return a;
						else return [...a, {
							label: store.item.localName(this.locale),
							value: index.toString()
						}]
					}
					else return a;
				}, [{label: bundle.find(this.locale, 'prev')+", "+this.reloadPage, value: '-1'}]).concat({label: bundle.find(this.locale, 'next'), value: '-2'}));
				this.builder.updateComponents(component).rerender();
			}
		},
		{
			placeholder: 'reload ammo with ...',
			options: this.user.inventory.items.reduce<MessageSelectOptionData[]>((a, store, index)=>{
				if(store.item.tags.some(tag=>tag instanceof AmmoTag)) {
					if(index < (this.reloadPage-1)*8 || index > this.reloadPage*8) return a;
					else return [...a, {
						label: store.item.localName(this.locale),
						value: store.item.id.toString()+'.'+index
					}]
				 }
				else return a;
			}, [{label: bundle.find(this.locale, 'prev')+", "+this.reloadPage, value: '-1'}]).concat({label: bundle.find(this.locale, 'next'), value: '-2'}),
			disabled: !(this.user.inventory.equipments.weapon instanceof SlotWeaponEntity)
		});

		const data = this.toActionData();
		this.builder
			.setDescription(bundle.format(this.locale, 'battle.start', this.user.user.username, Units.find(this.enemy.id).localName(this.user)))
			.setComponents(data.actions).setTriggers(data.triggers);
		await this.actionBuilder.build();
	  await this.updateEmbed();
	}

	private async validate() {
		const components = this.actionBuilder.getComponents();
		if(components.length) return;
		const button = components[0].components[0];
		button.setDisabled(this.user.inventory.equipments.weapon.cooldown > 0);
		const reload = components[2].components[0];
		reload.setDisabled(!(this.user.inventory.equipments.weapon instanceof SlotWeaponEntity));

		await this.builder.updateComponents([button, reload]).rerender();
	}

	private async addAction(action: ActionI) {
		if(action instanceof BaseAction) {
			if(this.isEvasion(action.owner)) {
				BaseManager.newErrorEmbed(this.user, this.interaction, bundle.find(this.locale, 'error.evasion'));
				return;
			}

			if(this.turn.stats.energy_max !== 0 && this.turn.stats.energy < action.cost) 
				return BaseManager.newErrorEmbed(this.user, this.interaction, bundle.format(this.locale, 'error.low_energy', this.turn.stats.energy, action.cost));
			else action.owner.stats.energy -= action.cost;
		}
		this.actionQueue.push(action);
		this.actionBuilder.setDescription(this.actionQueue.map<string>(a=>a.description()).join('```\n```\n')).rerender();
		await this.updateEmbed();
	}

	private async turnEnd() {
		this.turn.stats.energy = Math.min(this.turn.stats.energy+20, this.turn.stats.energy_max);
		this.turn.statuses.forEach(status=>{
			status.status.callback(this.turn, status);
			status.duration--;
			if(status.duration <= 0) this.turn.statuses.splice(this.turn.statuses.findIndex(s=>s == status), 1);
		});

		while(this.actionQueue.length != 0) {
			await this.actionQueue.shift()?.run();
			await this.actionBuilder.setDescription(this.actionQueue.map<string>(a=>a.description()).join('```\n```\n')).rerender();
		}

		if (this.user.stats.health <= 0 || this.enemy.stats.health <= 0) {
			await this.battleEnd(this.user);
			return true;
		}
		
		if(this.turn.inventory.equipments.weapon.cooldown > 0)
			this.turn.inventory.equipments.weapon.cooldown--;
		
		await this.updateEmbed();
		if(this.turn == this.user) {
			this.turn = this.enemy;
			if(await this.enemyTurn()) return true;
			this.status.set(this.turn, Status.DEFAULT);
		}
		this.status.set(this.turn, Status.DEFAULT);
		await this.updateEmbed();
	}

	private async enemyTurn() {
		if(this.enemy.inventory.equipments.weapon.item != Items.none) await this.addAction(new AttackAction(this, this.enemy, this.user));
		if(await this.turnEnd()) return true;

		this.turn = this.user;
		this.totalTurn++;
		await this.updateEmbed(bundle.format(this.locale, "battle.turnend", this.totalTurn));
	}

	public async updateEmbed(log?: string) {
		await this.validate();
		if(log) {
			if(this.battleLog.length > 5) this.battleLog.shift();
			this.battleLog.push(log);
		}
		this.builder.setFields([
			{ 
				name: this.user.user.username+(this.turn==this.user?`   ${this.totalTurn} `+bundle.find(this.locale, "turn"):"")+(this.isEvasion(this.user) ? `   ${bundle.find(this.locale, 'evasion')}` : ""), 
				value: 
				  `**${bundle.find(this.locale, 'health')}**: ${this.user.stats.health.toFixed(2)}/${this.user.stats.health_max.toFixed(2)}\n${Canvas.unicodeProgressBar(this.user.stats.health, this.user.stats.health_max)}`+
			  	`\n\n**${bundle.find(this.locale, 'energy')}**: ${this.user.stats.energy.toFixed(2)}/${this.user.stats.energy_max.toFixed(2)}\n${Canvas.unicodeProgressBar(this.user.stats.energy, this.user.stats.energy_max)}`+
			  	`\n\n**${bundle.find(this.locale, 'weapon')}**: ${this.user.inventory.equipments.weapon.item.localName(this.locale)}(${this.user.inventory.equipments.weapon.cooldown}), ${bundle.find(this.locale, "durability")} ${this.user.inventory.equipments.weapon.durability??"0"}`+ (this.user.inventory.equipments.weapon instanceof SlotWeaponEntity ? `, ${bundle.find(this.locale, 'ammo')} ${this.user.inventory.equipments.weapon.ammos.length} ${bundle.find(this.locale, 'unit.item')}` : "") +
					(this.user.statuses.length > 0 ? `\n**${bundle.find(this.locale, 'status')}**\n${this.user.statuses.map(status=>`${status.status.localName(this.locale)}: ${status.duration.toFixed()} ${bundle.find(this.locale, "turn")}`).join('\n')}` : ''),  
				inline: true 
			},
			{ 
				name: this.enemy.getUnit().localName(this.locale)+(this.turn==this.enemy?`   ${this.totalTurn} `+bundle.find(this.locale, "turn"):"")+(this.isEvasion(this.enemy) ? `   ${bundle.find(this.locale, 'evasion')}` : ""),  
			  value: 
					`**${bundle.find(this.locale, 'health')}**: ${this.enemy.stats.health.toFixed(2)}/${this.enemy.stats.health_max.toFixed(2)}\n${Canvas.unicodeProgressBar(this.enemy.stats.health, this.enemy.stats.health_max)}` +
					`\n\n**${bundle.find(this.locale, 'energy')}**: ${this.enemy.stats.energy.toFixed(2)}/${this.enemy.stats.energy_max.toFixed(2)}\n${Canvas.unicodeProgressBar(this.enemy.stats.energy, this.enemy.stats.energy_max)}` +
			  	`\n\n**${bundle.find(this.locale, 'weapon')}**: ${this.enemy.inventory.equipments.weapon.item.localName(this.locale)}(${this.enemy.inventory.equipments.weapon.cooldown||0}), ${bundle.find(this.locale, "durability")} ${this.enemy.inventory.equipments.weapon.durability??"0"}`+ (this.enemy.inventory.equipments.weapon instanceof SlotWeaponEntity ? `, ${bundle.find(this.locale, 'ammo')} ${this.enemy.inventory.equipments.weapon.ammos.length} ${bundle.find(this.locale, 'unit.item')}` : "") +
					(this.enemy.statuses.length > 0 ? `\n**${bundle.find(this.locale, 'status')}**\n${this.enemy.statuses.map(status=>`${status.status.localName(this.locale)}: ${status.duration.toFixed()} ${bundle.find(this.locale, "turn")}`).join('\n')}` : ''), 
				inline: true 
			},
			{
				name: 'Logs', 
				value: this.battleLog.map(log => codeBlock('diff', log)).join('')||"Empty"
			}
		]).rerender();
	}

	private async battleEnd(user: User) {
		this.builder.setComponents([]);
		this.actionBuilder.remove();

		if(this.enemy.stats.health <= 0) {
			const unit = Units.find(this.enemy.id);
			const items: { item: Item, amount: number }[] = [];

			//전투 보상은 최소 1개, 최대 적 레벨의 4배만큼의 랜덤한 아이템
			for (let i = 0; i < Math.floor(Mathf.range(unit.level, unit.level * 4)) + 1; i++) {
				const item = getOne(Items.items.filter((i) => i.dropOnBattle));
				const obj = items.find((i) => i.item == item);
				if (obj) obj.amount++;
				else items.push({ item, amount: 1 });
			}

			await this.updateEmbed('+ '+(this.enemy.stats.health < 0 ? bundle.find(this.locale, 'battle.overkill')+' ' : '')+bundle.format(this.locale, 'battle.win', this.enemy.stats.health.toFixed(2)));
			await this.builder.addFields(
				{
					name: 'Battle End', 
					value: Strings.color(bundle.format(this.locale, 'battle.result', user.exp, user.exp += unit.level * (1 + unit.ratio) * 10, items.map((i) => `${i.item.localName(user)} +${i.amount} ${bundle.find(this.locale, 'unit.item')}`).join('\n'))
						+'\n'+items.map((i) => user.giveItem(i.item)).filter((e) => e).join('\n'), [ANSIStyle.BLUE])
				}
			).rerender();
		}
		else if(user.stats.health <= 0) {
			await this.updateEmbed('- '+bundle.format(this.locale, 'battle.lose', user.stats.health.toFixed(2)));
		}
		this.builder.addRemoveButton();
    this.builder.rerender();
		save();
	}
}