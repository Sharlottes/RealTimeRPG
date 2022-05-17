import { CommandInteraction, MessageSelectOptionData } from 'discord.js';

import { ItemStack, UnitEntity, ItemEntity, getOne, save, findMessage, User } from '@RTTRPG/game';
import { Units, Item, Items, Weapon } from '@RTTRPG/game/contents';
import { SelectManager } from '@RTTRPG/game/managers';
import { Mathf, Canvas, Strings, ANSIStyle } from '@RTTRPG/util';
import { bundle } from '@RTTRPG/assets';
import { EntityI } from '@RTTRPG/@type';

interface ActionI {
	manager: BattleManager;
	name: string;
	run(): void;
}

class AttackAction implements ActionI { 
	public name = 'attack';
  manager: BattleManager;
	private attacker: EntityI;
	private target: EntityI;
	
	constructor(manager: BattleManager, attacker: EntityI, target: EntityI) {
		this.manager = manager;
		this.attacker = attacker;
		this.target = target;
	}
	
	public run() {
		if(this.attacker.stats.health <= 0 || this.target.stats.health <= 0) return;
		const entity = this.attacker.inventory.weapon.items[0];
		const weapon = this.attacker.inventory.weapon.getItem<Weapon>();

		if(!entity.cooldown) return;
		
		if(entity.cooldown > 0) {
			this.manager.updateEmbed(bundle.format(this.manager.locale, 'battle.cooldown', entity.cooldown.toFixed(2)));
		} else {
			entity.cooldown = weapon.cooldown;
			if(entity.durability) {
				if(entity.durability > 0) entity.durability--;
				if(entity.durability <= 0) {
					this.manager.updateEmbed(bundle.format(this.manager.locale, 'battle.broken', weapon.localName(this.manager.user)));
					this.attacker.inventory.weapon = new ItemStack(Items.punch.id);
				}
			}

			this.manager.updateEmbed((this.attacker.id == this.manager.user.id?'+ ':'- ')+weapon.attack(this.attacker, this.target, this.manager.locale));
		}
	}
}

class SwapAction implements ActionI {
	public name = 'swap';
  manager: BattleManager;
	private owner: EntityI;
	private weapon: Weapon;

	constructor(manager: BattleManager, owner: EntityI, weapon: Weapon) {
		this.manager = manager;
		this.owner = owner;
		this.weapon = weapon;
	}

	public run() {
		const entity = this.owner.inventory.items.find((e) => e.id == this.weapon.id);
		if(!entity) return this.manager.updateEmbed(bundle.format(this.manager.locale, 'missing_item', this.weapon.localName(this.manager.locale)));
		
		this.owner.switchWeapon(this.weapon, entity);
		this.manager.updateEmbed(bundle.format(this.manager.locale, 'switch_change', this.weapon.localName(this.manager.locale), this.owner.inventory.weapon.getItem().localName(this.manager.locale)));
	}
}

export default class BattleManager extends SelectManager{
	private target: UnitEntity;
	private interval?: NodeJS.Timeout;
	private battleLog: string[] = [];
	private renderQueue: (()=>Promise<unknown>)[] = [];
	private actionQueue: ActionI[] = [];
	private rendering = false;

  public constructor(user: User, interaction: CommandInteraction, target: UnitEntity, builder = findMessage(interaction.id).builder, last?: SelectManager) {
    super(user, interaction, builder);
		this.target = target;
		console.log('on constructor, '+this.target);
    if(new.target === BattleManager) this.init();
	}
	
	protected override init() {
		console.log('on init, '+this.target);
		this.addButtonSelection('attack', 0, (user) => {
			this.actionQueue.push(new AttackAction(this, user, this.target));
		});
		this.addMenuSelection('swap', 1, (user, row, interactionCallback) => {
			if (interactionCallback.isSelectMenu()) {
				const weapon = Items.find<Weapon>(Number(interactionCallback.values[0]));
				this.actionQueue.push(new SwapAction(this, user, weapon));
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
			.setDescription(bundle.format(this.locale, 'battle.start', this.user.user.username, Units.find(this.target.id).localName(this.user)))
			.setComponents(data.actions).setTriggers(data.triggers);
		console.log('before setting interval, '+this.target);
		this.interval = setInterval(()=>this.update(), 100);
	}

	private async update() {
		console.log('on updating, '+this.target);

		for(let i = 0; i < this.actionQueue.length; i++) {
			this.actionQueue.shift()?.run();
		}

		if(this.target.stats.health > 0) {
			this.target.update();
			const weaponEntity: ItemEntity = this.target.inventory.weapon.items[0];
			if(weaponEntity.cooldown) {
				weaponEntity.cooldown -= 100 / 1000;
				if (weaponEntity.cooldown <= 0) {
					this.actionQueue.push(new AttackAction(this, this.target, this.user));
				}
			}
		}

		this.updateEmbed();
		this.renderQueue.push(this.builder.rerender);
		if(!this.rendering) {
			this.rendering = true;
			for(let i = 0; i < this.renderQueue.length; i++) {
				await this.renderQueue.shift()?.call(this.builder).catch(e=>e);
			}
			this.rendering = false;
		}

		if (this.user.stats.health <= 0 || this.target.stats.health <= 0) await this.battleEnd(this.user);
	}

	public updateEmbed(log?: string) {
		if(log) {
			if(this.battleLog.length > 5) this.battleLog.shift();
			this.battleLog.push(log);
		}
		this.builder.setFields([
			{ 
				name: this.user.user.username, 
				value: `**${bundle.find(this.locale, 'health')}**: ${this.user.stats.health.toFixed(2)}/${this.user.stats.health_max.toFixed(2)}\n${Canvas.unicodeProgressBar(this.user.stats.health, this.user.stats.health_max)}`+
					(this.user.statuses.length > 0 ? `\n**${bundle.find(this.locale, 'status')}**\n${this.user.statuses.map(status=>`${status.status.localName(this.locale)}: ${status.duration.toFixed(2)}s`).join('\n')}` : ''),  
				inline: true 
			},
			{ 
				name: this.target.getUnit().localName(this.locale), 
				value: `**${bundle.find(this.locale, 'health')}**: ${this.target.stats.health.toFixed(2)}/${this.target.stats.health_max.toFixed(2)}\n${Canvas.unicodeProgressBar(this.target.stats.health, this.target.stats.health_max)}`+
					(this.target.statuses.length > 0 ? `\n**${bundle.find(this.locale, 'status')}**\n${this.target.statuses.map(status=>`${status.status.localName(this.locale)}: ${status.duration.toFixed(2)}s`).join('\n')}` : ''), 
				inline: true 
			},
			{
				name: 'Logs', 
				value: "```diff\n"+this.battleLog.join('```\n```diff\n')+"```"
			}
		]);
	}

	private async battleEnd(user: User) {
		if(this.interval) clearInterval(this.interval);
		this.builder.setComponents([]);

		if(this.target.stats.health <= 0) {
			const unit = Units.find(this.target.id);
			const items: { item: Item, amount: number }[] = [];

			//전투 보상은 최소 1개, 최대 적 레벨의 4배만큼의 랜덤한 아이템
			for (let i = 0; i < Math.floor(Mathf.range(unit.level, unit.level * 4)) + 1; i++) {
				const item = getOne(Items.items.filter((i) => i.dropOnBattle));
				const obj = items.find((i) => i.item == item);
				if (obj) obj.amount++;
				else items.push({ item, amount: 1 });
			}

			this.updateEmbed('+ '+(this.target.stats.health < 0 ? bundle.find(this.locale, 'battle.overkill')+' ' : '')+bundle.format(this.locale, 'battle.win', this.target.stats.health.toFixed(2)));
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
		
		for(let i = 0; i < this.renderQueue.length; i++)
			await this.renderQueue[i].call(this.builder).catch(e=>e);
	}
}