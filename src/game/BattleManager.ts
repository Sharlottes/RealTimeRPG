import { InteractionButtonOptions, MessageSelectMenuOptions, MessageSelectOptionData } from 'discord.js';

import { User } from '../modules';
import { Utils } from '../util';
import { UnitEntity, Items, Units } from '.';
import { Item, ItemStack, Weapon } from './contents';
import Assets from '../assets';
import { EventSelection, SelectEvent } from '../event';

import { getOne, save } from './rpg_';

const Bundle = Assets.bundle;
const { Mathf } = Utils;

const battleSelection : EventSelection[][] = [
	[
		new EventSelection('attack', (user) => {
			if(!user.selectBuilder || !user.enemy) return;

			// 쿨다운 끝나면 공격
			if (user.cooldown > 0) {
				user.battleLog.push(`\`\`\`diff\n+ ${Bundle.format(user.lang, 'battle.cooldown', user.cooldown.toFixed(2))}\n\`\`\``);
				user.edit({ embeds: [user.selectBuilder] });
			} else {
				const weapon: Weapon = ItemStack.getItem(user.inventory.weapon);

				// 내구도 감소, 만약 내구도가 없으면 주먹으로 교체.
				if(user.inventory.weapon.id !== 5) {
					if (user.inventory.weapon.durability > 0) user.inventory.weapon.durability--;
					else {
						const punch = Items.find<Weapon>(5);
						user.battleLog.push(`\`\`\`diff\n+ ${Bundle.format(user.lang, 'battle.broken', weapon.localName(user))}\n\`\`\``);
						user.inventory.weapon.id = punch.id;
						user.inventory.weapon.durability = punch.durability;
					}
				}	

				//임베드 전투로그 업데이트
				user.battleLog.push(`\`\`\`diff\n+ ${weapon.attack(user, user.enemy.stats)}\n\`\`\``);
				updateEmbed(user);
				user.edit({ embeds: [user.selectBuilder] });

				// 적이 죽으면 전투 끝
				if (user.enemy.stats.health <= 0)	battleEnd(user);
			} 
		}),
		new EventSelection('show-logs', (user, actions) => {
			if(!user.selectBuilder || !user.enemy) return;
			user.allLog = true;

			actions[0].components[1].setDisabled(true);
			actions[0].components[2].setDisabled(false);
			updateEmbed(user);
		}, 'button', {style: 'SECONDARY'} as InteractionButtonOptions),
		new EventSelection('hide-logs', (user, actions) => {	
			if(!user.selectBuilder) throw new Error('enemy is not exist');
			user.allLog = false;

			actions[0].components[1].setDisabled(false);
			actions[0].components[2].setDisabled(true);
			updateEmbed(user);
		}, 'button', {style: 'SECONDARY'} as InteractionButtonOptions)
	],
	[
		new EventSelection('swap', (user, actions, interactionCallback) => {
			if (interactionCallback.isSelectMenu()) {
				const id = Number(interactionCallback.values[0]);
				const weapon: Weapon = Items.find(id);
				const entity = user.inventory.items.find((e) => e.id == id);
				const weaponFrom = ItemStack.getItem(user.inventory.weapon).localName(user);
				const weaponTo = weapon.localName(user);
				if(!user.selectBuilder || !entity || !user.enemy) return;
				
				entity.amount--;
				if (!entity.amount) user.inventory.items.splice(user.inventory.items.indexOf(entity), 1);

				user.switchWeapon(weapon);
				user.battleLog.push(`\`\`\`\n${Bundle.format(user.lang, 'switch_change', weaponTo, weaponFrom)}\n\`\`\``);
				updateEmbed(user);
				save();
			}
		}, 'select', u=>{
			const options = u.inventory.items.filter((e) => Items.find(e.id) instanceof Weapon).map((stack) => ({
				label: Items.find(stack.id)?.name,
				value: `${stack.id}`
			} as MessageSelectOptionData));

			return {
				placeholder: 'swap weapon to ...',
				options: options.length > 0 ? options : [{label: Items.find(5).name, value: "5"}]
			} as MessageSelectMenuOptions;
		})
	]
];

function updateEmbed(user: User) {
	if(!user.selectBuilder) throw new Error("user selectBuilder is not exist!");
	if(!user.enemy) throw new Error("user enemy is not exist!");

	return user.selectBuilder.setFields([
		{
			name: `Battle Status`,
			value: `You: ${Utils.Canvas.unicodeProgressBar(user.stats.health, user.stats.health_max)}\nEnemy: ${Utils.Canvas.unicodeProgressBar(user.enemy.stats.health, user.enemy.stats.health_max)}`
		},
		{
			name: `Logs (${user.battleLog.length})`, 
			value: `${((user.battleLog.length >= 4 && !user.allLog) 
				? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) 
				: user.battleLog.slice(Math.max(0, user.battleLog.length - 10), user.battleLog.length)).join('')}`
		}
	]);
}

function battleEnd(user: User) {
	if(!user.enemy) throw new Error("enemy unit is not exist!");
	if(!user.selectBuilder) throw new Error("msg builder is not exist!");
	const unit = Units.find(user.enemy.id);
	const items: { item: Item, amount: number }[] = [];
	
	if(user.enemy.stats.health <= 0) {
		//전투 보상은 최소 1개, 최대 적 레벨의 4배만큼의 랜덤한 아이템
		for (let i = 0; i < Math.floor(Mathf.range(unit.level, unit.level * 4)) + 1; i++) {
			const item = getOne(Items.items.filter((i) => i.dropOnBattle));
			const obj = items.find((i) => i.item == item);
			if (obj) obj.amount++;
			else items.push({ item, amount: 1 });
		}

		user.battleLog.push(`\`\`\`diff\n+ ${user.enemy.stats.health < 0 ? Bundle.find(user.lang, 'battle.overkill') : ''} ${Bundle.format(user.lang, 'battle.win', user.enemy.stats.health.toFixed(2))}\`\`\``);
		
		//임베드에 전투 결과 메시지 추가
		updateEmbed(user).addFields(
			{
				name: 'Battle End', 
				value: 
					`\`\`\`ini\n[${Bundle.format(user.lang, 'battle.result', user.exp, user.exp += unit.level * (1 + unit.ratio) * 10, items.map((i) => `${i.item.localName(user)} +${i.amount} ${Bundle.find(user.lang, 'unit.item')}`).join('\n'))}
					\n${items.map((i) => user.giveItem(i.item)).filter((e) => e).join('\n')}]\`\`\``
			}
		);
	}
	else if(user.stats.health <= 0) {
		//임베드에 전투 결과 메시지 추가
		user.stats.health = 0.1 * user.stats.health_max;
		user.battleLog.push(`\`\`\`diff\n- ${Bundle.format(user.lang, 'battle.lose', user.stats.health.toFixed(2))}\n\`\`\``);
		updateEmbed(user);
	}
	else throw new Error("battle is ended with no-one-dead");

	//유저데이터 초기화 및 저장
	const interval = user.enemy.battleInterval;
	if(interval) clearInterval(interval);
	
	user.battleLog = [];
	user.status.clearSelection();
	user.edit({ embeds: [user.selectBuilder], components: [] }); 
	user.selectBuilder = undefined;
	user.enemy = undefined;
	save();
}

export function battle(user: User, entity: UnitEntity) {
	if(!user.selectBuilder) throw new Error("msg builder is not exist!");
	//update user data
	user.enemy = entity; 
	user.battleLog = [];

	const weapon: Weapon | undefined = Items.find<Weapon>(user.enemy.items.weapon.id);
	const data = SelectEvent.toActionData(battleSelection, user);
	user.selectBuilder
		.setDescription(Bundle.format(user.lang, 'battle.start', user.id, Units.find(user.enemy.id).localName(user)))
		.setComponents(data.actions).setTriggers(data.triggers);
		user.selectBuilder
	//user.send({ embeds: [user.selectBuilder], components: data.actions });


	if (weapon&&!user.enemy.battleInterval) {
		user.enemy.battleInterval = setInterval(() => {
			if (!user.enemy || !user.selectBuilder) return;

			user.enemy.cooldown -= 100 / 1000;
			if (user.enemy.cooldown <= 0 && user.enemy.stats.health > 0) {
				user.enemy.cooldown = weapon.cooldown;

				//임베드 전투로그 업데이트
				user.battleLog.push(`\`\`\`diff\n- ${weapon.attack(user)}\n\`\`\``);
				updateEmbed(user);
				user.edit({ embeds: [user.selectBuilder] });

				// 유저가 죽으면 전투 끝
				if (user.stats.health <= 0) battleEnd(user);
			}
		}, 100);
	}
}