import { CommandInteraction, MessageEmbed, MessageSelectOptionData, MessageActionRowComponent } from 'discord.js';

import { ItemStack, UnitEntity, getOne, save, findMessage, User } from '@RTTRPG/game';
import { Units, Item, Items, Weapon } from '@RTTRPG/game/contents';
import { Mathf, Canvas, Strings, ANSIStyle } from '@RTTRPG/util';
import { SelectManager, BaseManager } from '@RTTRPG/game/managers';
import { bundle } from '@RTTRPG/assets';
import { EntityI } from '@RTTRPG/@type';
import { BaseEmbed } from '../../modules/BaseEmbed';
import { app } from '@RTTRPG/index';

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
  
  constructor(manager: BattleManager, owner: EntityI, cost: number) {
    this.manager = manager;
    this.owner = owner;
    this.cost = cost;
    
    this.owner.stats.energy -= cost;
  }

	abstract run(): Promise<void>;
	abstract description(): string;
}

class AttackAction extends BaseAction { 
	private enemy: EntityI;
	
	constructor(manager: BattleManager, owner: EntityI, enemy: EntityI) {
		super(manager, owner, 20);
		this.name = 'attack';
		this.enemy = enemy;
	}
	
	public async run() {
		if(this.owner.stats.health <= 0 || this.enemy.stats.health <= 0) return;
		const entity = this.owner.inventory.weapon.items[0];
		const weapon = this.owner.inventory.weapon.getItem<Weapon>();

		if(entity.cooldown === undefined) return;
		
		if(entity.cooldown > 0) {
			await this.manager.updateEmbed(bundle.format(this.manager.locale, 'battle.cooldown', entity.cooldown.toFixed(2)));
		} else {
			entity.cooldown = weapon.cooldown;
			if(entity.durability) {
				if(entity.durability > 0) entity.durability--;
				if(entity.durability <= 0) {
					await this.manager.updateEmbed(bundle.format(this.manager.locale, 'battle.broken', weapon.localName(this.manager.locale)));
					this.owner.inventory.weapon = new ItemStack(Items.punch.id);
				}
			}

			await this.manager.updateEmbed((this.owner.id == this.manager.user.id?'+ ':'- ')+weapon.attack(this.owner, this.enemy, this.manager.locale));
		}
	}

	public description(): string {
		return bundle.format(this.manager.locale, 'action.attack.description', typeof this.owner.name !== 'string'?this.owner.name(this.manager.locale):this.owner.name , typeof this.enemy.name !== 'string'?this.enemy.name(this.manager.locale):this.enemy.name , this.owner.inventory.weapon.getItem<Weapon>().localName(this.manager.locale));
	}
}

class SwapAction extends BaseAction {
	private weapon: Weapon;

	constructor(manager: BattleManager, owner: EntityI, weapon: Weapon) {
		super(manager, owner, 10);
		this.weapon = weapon;
	}

	public async run() {
		const entity = this.owner.inventory.items.find((e) => e.id == this.weapon.id);
		if(!entity) return this.manager.updateEmbed(bundle.format(this.manager.locale, 'missing_item', this.weapon.localName(this.manager.locale)));
		
		this.owner.switchWeapon(this.weapon, entity);
	  await this.manager.updateEmbed(bundle.format(this.manager.locale, 'switch_change', this.weapon.localName(this.manager.locale), this.owner.inventory.weapon.getItem().localName(this.manager.locale)));
	}

	public description(): string {
		return `swap weapon: ${this.owner.inventory.weapon.getItem().localName(this.manager.locale)} to ${this.weapon.localName(this.manager.locale)}`;
	}
}

export default class BattleManager extends SelectManager {
	private enemy: UnitEntity;
	private battleLog: string[] = [];
	private actionQueue: ActionI[] = [];
	private turn: EntityI = this.user; //normally, user first
	private actionBuilder: BaseEmbed;

  public constructor(user: User, interaction: CommandInteraction, enemy: UnitEntity, builder = findMessage(interaction.id).builder, last?: SelectManager) {
    super(user, interaction, builder);
		this.enemy = enemy;
		this.actionBuilder = new BaseEmbed(interaction, false).setPages(new MessageEmbed().setTitle('Action Queue'));
		if(new.target === BattleManager) this.init();
	}

	protected override async init() {
		this.addButtonSelection('attack', 0, (user) => {
			const entity = user.inventory.weapon.items[0];
			if(entity.cooldown !== undefined && entity.cooldown > 0) {
				BaseManager.newErrorEmbed(this.user, this.interaction, bundle.format(this.locale, 'battle.cooldown', entity.cooldown.toFixed(2)));
			}
			else {
				this.doAction(new AttackAction(this, user, this.enemy));
			}
		});
		this.addButtonSelection('turn', 0, async (user) => {
			await this.turnEnd();
			this.turn = this.enemy;
			await this.enemyTurn();
		});
		this.addMenuSelection('swap', 1, (user, row, interactionCallback) => {
			if (interactionCallback.isSelectMenu()) {
				const weapon = Items.find<Weapon>(Number(interactionCallback.values[0]));
				this.doAction(new SwapAction(this, user, weapon));
			}
		},
		{
			placeholder: 'swap weapon to ...',
			options: this.user.inventory.items.reduce<MessageSelectOptionData[]>((a, i)=>i.getItem() instanceof Weapon ? [...a, {
				label: i.getItem().localName(this.user),
				value: i.id.toString()
			}] : a, [])
		});

		const data = this.toActionData();
		this.builder
			.setDescription(bundle.format(this.locale, 'battle.start', this.user.user.username, Units.find(this.enemy.id).localName(this.user)))
			.setComponents(data.actions).setTriggers(data.triggers);

		await this.actionBuilder.build();
	  this.updateEmbed();
	}
	
	private doAction(action: ActionI) {
		this.updateEmbed();
		if(action instanceof BaseAction && this.turn.stats.energy_max !== 0 && this.turn.stats.energy < action.cost)
		  return BaseManager.newErrorEmbed(this.user, this.interaction, bundle.format(this.locale, 'error.low_energy', this.turn.stats.energy, action.cost));
		this.actionQueue.push(action);
		this.actionBuilder.setDescription(this.actionQueue.map<string>(a=>a.description()).join('```\n```\n')).rerender();
	}

	private async turnEnd() {
		if(this.turn.inventory.weapon.items[0].cooldown && this.turn.inventory.weapon.items[0].cooldown > 0)
			this.turn.inventory.weapon.items[0].cooldown -= 1;

		while(this.actionQueue.length != 0) {
			await this.actionQueue.shift()?.run();
			await this.actionBuilder.setDescription(this.actionQueue.map<string>(a=>a.description()).join('```\n```\n')).rerender();
		}
		if (this.user.stats.health <= 0 || this.enemy.stats.health <= 0) this.battleEnd(this.user);
	}

	private async enemyTurn() {
		this.doAction(new AttackAction(this, this.enemy, this.user));
		await this.turnEnd();
		this.turn = this.user;
	}

	public async updateEmbed(log?: string) {
		if(log) {
			if(this.battleLog.length > 5) this.battleLog.shift();
			this.battleLog.push(log);
		}
		this.builder.setFields([
			{ 
				name: this.user.user.username, 
				value: 
				  `**${bundle.find(this.locale, 'health')}**: ${this.user.stats.health.toFixed(2)}/${this.user.stats.health_max.toFixed(2)}\n${Canvas.unicodeProgressBar(this.user.stats.health, this.user.stats.health_max)}`+
			  	`\n\n**${bundle.find(this.locale, 'energy')}**: ${this.user.stats.energy.toFixed(2)}/${this.user.stats.energy_max.toFixed(2)}\n${Canvas.unicodeProgressBar(this.user.stats.energy, this.user.stats.energy_max)}`+
			  	`\n\n**${bundle.find(this.locale, 'weapon')}**: ${this.user.inventory.weapon.getItem<Weapon>().localName(this.locale)} (${this.user.inventory.weapon.items[0].cooldown} ${bundle.find(this.locale, "turn")})`+
					(this.user.statuses.length > 0 ? `\n**${bundle.find(this.locale, 'status')}**\n${this.user.statuses.map(status=>`${status.status.localName(this.locale)}: ${status.duration.toFixed(2)}s`).join('\n')}` : ''),  
				inline: true 
			},
			{ 
				name: this.enemy.getUnit().localName(this.locale),
			  value: 
					`**${bundle.find(this.locale, 'health')}**: ${this.enemy.stats.health.toFixed(2)}/${this.enemy.stats.health_max.toFixed(2)}\n${Canvas.unicodeProgressBar(this.enemy.stats.health, this.enemy.stats.health_max)}` +
					`\n\n**${bundle.find(this.locale, 'energy')}**: ${this.enemy.stats.energy.toFixed(2)}/${this.enemy.stats.energy_max.toFixed(2)}\n${Canvas.unicodeProgressBar(this.enemy.stats.energy, this.enemy.stats.energy_max)}` +
			  	`\n\n**${bundle.find(this.locale, 'weapon')}**: ${this.enemy.inventory.weapon.getItem<Weapon>().localName(this.locale)} (${this.enemy.inventory.weapon.items[0].cooldown||0} ${bundle.find(this.locale, "turn")})`+
					(this.enemy.statuses.length > 0 ? `\n**${bundle.find(this.locale, 'status')}**\n${this.enemy.statuses.map(status=>`${status.status.localName(this.locale)}: ${status.duration.toFixed(2)}s`).join('\n')}` : ''), 
				inline: true 
			},
			{
				name: 'Logs', 
				value: "```diff\n"+this.battleLog.join('```\n```diff\n')+"```"
			}
		]).rerender();
	}

	private async battleEnd(user: User) {
		this.builder.setComponents([]);

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

			this.updateEmbed('+ '+(this.enemy.stats.health < 0 ? bundle.find(this.locale, 'battle.overkill')+' ' : '')+bundle.format(this.locale, 'battle.win', this.enemy.stats.health.toFixed(2)));
			this.builder.addFields(
				{
					name: 'Battle End', 
					value: Strings.color(bundle.format(this.locale, 'battle.result', user.exp, user.exp += unit.level * (1 + unit.ratio) * 10, items.map((i) => `${i.item.localName(user)} +${i.amount} ${bundle.find(this.locale, 'unit.item')}`).join('\n'))
						+'\n'+items.map((i) => user.giveItem(i.item)).filter((e) => e).join('\n'), [ANSIStyle.BLUE])
				}
			);
		}
		else if(user.stats.health <= 0) {
			this.updateEmbed('- '+bundle.format(this.locale, 'battle.lose', user.stats.health.toFixed(2)));
		}
    
		save();
	}
}