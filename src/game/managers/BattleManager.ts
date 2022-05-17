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
		const inventory = this.attacker.inventory;
		const weaponEntity: ItemEntity = inventory.weapon.items[0];
		const weapon = inventory.weapon.getItem<Weapon>();

		if (weaponEntity?.cooldown && weaponEntity.cooldown > 0) {
			this.manager.updateEmbed('+ '+bundle.format(this.manager.locale, 'battle.cooldown', weaponEntity.cooldown.toFixed(2)));
		} else {
			// 내구도 감소, 만약 내구도가 없으면 주먹으로 교체.
			if(weaponEntity?.durability) {
				if(weaponEntity.durability > 0) weaponEntity.durability--;
				if(weaponEntity.durability <= 0) {
					this.manager.updateEmbed('+ '+bundle.format(this.manager.locale, 'battle.broken', weapon.localName(this.manager.user)));
					inventory.weapon = new ItemStack(Items.punch.id);
				}
			}

			//임베드 전투로그 업데이트
			this.manager.updateEmbed('+ '+weapon.attack(this.attacker, this.target, this.manager.locale));
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
	private rendering = false;

  public constructor(user: User, interaction: CommandInteraction, target: UnitEntity, builder = findMessage(interaction.id).builder, last?: SelectManager) {
    super(user, interaction, builder);
		this.target = target;
    if(new.target === BattleManager) this.init();
	}
	
	protected override init() {
		this.addButtonSelection('attack', 0, async (user) => {
			if(user.stats.health <= 0 || this.target.stats.health <= 0) return;
			const inventory = this.user.inventory;
			const weaponEntity: ItemEntity = inventory.weapon.items[0];
			const weapon = inventory.weapon.getItem<Weapon>();

			if (weaponEntity?.cooldown && weaponEntity.cooldown > 0) {
				this.updateEmbed('+ '+bundle.format(this.locale, 'battle.cooldown', weaponEntity.cooldown.toFixed(2)));
			} else {
				// 내구도 감소, 만약 내구도가 없으면 주먹으로 교체.
				if(weaponEntity?.durability) {
					if(weaponEntity.durability > 0) weaponEntity.durability--;
					if(weaponEntity.durability <= 0) {
						this.updateEmbed('+ '+bundle.format(this.locale, 'battle.broken', weapon.localName(user)));
						inventory.weapon = new ItemStack(Items.punch.id);
					}
				}

				//임베드 전투로그 업데이트
				this.updateEmbed('+ '+weapon.attack(user, this.target, this.locale));
			}
      this.renderQueue.push(this.builder.rerender);
		});
		this.addMenuSelection('swap', 1, async (user, actions, interactionCallback) => {
			if (interactionCallback.isSelectMenu()) {
				const id = Number(interactionCallback.values[0]);
				const weapon: Weapon = Items.find(id);
				const entity = user.inventory.items.find((e) => e.id == id);
				if(!entity) return this.updateEmbed(bundle.format(this.locale, 'missing_item', weapon.localName(this.locale)));
				
				user.switchWeapon(weapon, entity);
				this.updateEmbed(bundle.format(this.locale, 'switch_change', weapon.localName(user), user.inventory.weapon.getItem().localName(user)));

				this.renderQueue.push(this.builder.rerender);
			}
		},
		{
			placeholder: 'swap weapon to ...',
			options: this.user.inventory.items.reduce<MessageSelectOptionData[]>((a, i)=>i.getItem() instanceof Weapon ? [...a, {
				label: i.getItem().localName(this.user),
				value: i.id.toString()
			}] : a, [])
		});

		if(this.builder) {
			const data = this.toActionData();
			this.builder
				.setDescription(bundle.format(this.locale, 'battle.start', this.user.user.username, Units.find(this.target.id).localName(this.user)))
				.setComponents(data.actions)
				.setTriggers(data.triggers);
		}		
		let i = 0;
		this.interval = setInterval(async () => {
			if (this.user.stats.health <= 0 || this.target.stats.health <= 0) await this.battleEnd(this.user);
				else {
				const inventory = this.target.inventory;
				const weaponEntity: ItemEntity = inventory.weapon.items[0];
				const weapon: Weapon = Items.find(inventory.weapon.id);

				this.target.update();
				this.updateEmbed();

				if(weaponEntity?.cooldown) weaponEntity.cooldown -= 100 / 1000;
				if (weaponEntity?.cooldown && weaponEntity.cooldown <= 0 && this.target.stats.health > 0) {
					weaponEntity.cooldown = weapon.cooldown;

					// 내구도 감소, 만약 내구도가 없으면 주먹으로 교체.
					if(weaponEntity?.durability) {
						if(weaponEntity.durability > 0) weaponEntity.durability--;
						if(weaponEntity.durability <= 0) {
							const punch = Items.punch;
							this.updateEmbed('- '+bundle.format(this.locale, 'battle.broken', weapon.localName(this.user)));
							inventory.weapon = new ItemStack(punch.id);
						}
					}

					//임베드 전투로그 업데이트
					this.updateEmbed('- '+weapon.attack(this.target, this.user, this.locale));
				}

				this.renderQueue.push(this.builder.rerender);
				if(this.rendering) return;
				this.rendering = true;
				i++;
				const j = i;
				for(let i = 0; i < this.renderQueue.length; i++) {
					await this.renderQueue.shift()?.call(this.builder).catch(e=>e);
				}
				
				console.log(j+"th rendering ended");
				this.rendering = false;
			}
		}, 100);
	}

	updateEmbed(log?: string) {
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

	async battleEnd(user: User) {
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