import { InteractionButtonOptions, MessageSelectMenu, MessageSelectMenuOptions, MessageSelectOptionData } from 'discord.js';

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
			const weapon: Weapon = ItemStack.getItem(user.inventory.weapon);

			if (user.cooldown > 0) {
				user.battleLog.push(`\`\`\`diff\n+ ${Bundle.format(user.lang, 'battle.cooldown', user.cooldown.toFixed(2))}\n\`\`\``);
			} else {
				// 쿨다운 끝나면 공격
				user.battleLog.push(`\`\`\`diff\n+ ${weapon.attack(user, user.enemy.stats)}\n\`\`\``);

				// 내구도 감소, 만약 내구도가 없거나 0 이하로 내려가면 주먹으로 교체.
				if (user.inventory.weapon.durability) user.inventory.weapon.durability--;
				if ((!user.inventory.weapon.durability || user.inventory.weapon.durability <= 0) && user.inventory.weapon.id !== 5) {
					user.battleLog.push(`\`\`\`diff\n+ ${Bundle.format(user.lang, 'battle.broken', weapon.localName(user))}\n\`\`\``);
					user.inventory.weapon.id = 5;
				}

				//임베드 전투로그 업데이트
				user.selectBuilder.setFields([
					{
						name: `Battle Status`,
						value: `You: ${Utils.Canvas.unicodeProgressBar(user.stats.health, user.stats.health_max)}\nEnemy: ${Utils.Canvas.unicodeProgressBar(user.enemy.stats.health, user.enemy.stats.health_max)}`
					},
					{
						name: `Logs (${user.battleLog.length})`, 
						value: `${((user.battleLog.length >= 4 && !user.allLog) 
							? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) 
							: user.battleLog).join('')
						}`
					}
				]);

				// 적이 죽으면 전투 끝
				if (user.enemy.stats.health <= 0) {
					battleEnd(user);
					return;
				}
				user.selectBuilder.interaction.editReply({embeds: [user.selectBuilder]});
			} 
		}),
		new EventSelection('show-logs', (user, actions) => {
			if(!user.selectBuilder) return;
			user.allLog = true;
			actions[0].components[1].setDisabled(true);
			actions[0].components[2].setDisabled(false);
			if (user.enemy) {
					user.selectBuilder
					.setFields([
						{
							name: `Battle Status`,
							value: `You: ${Utils.Canvas.unicodeProgressBar(user.stats.health, user.stats.health_max)}\nEnemy: ${Utils.Canvas.unicodeProgressBar(user.enemy.stats.health, user.enemy.stats.health_max)}`
						},
						{
							name: `Logs (${user.battleLog.length})`, 
							value: `${((user.battleLog.length >= 4 && !user.allLog) 
								? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) 
								: user.battleLog).join('')
							}`
						}
					])
					.setComponents(actions)
					.addComponents(new MessageSelectMenu().setCustomId('swap').setPlaceholder('swap weapon to ...').addOptions(user.inventory.items.filter((e) =>  Items.find(e.id) instanceof Weapon).map((stack) => ({
						label: Items.find(stack.id)?.name,
						value: `${stack.id}`,
					}))));
			}
		}, 'button', {style: 'SECONDARY'} as InteractionButtonOptions),
		new EventSelection('hide-logs', (user, actions) => {	
			if(!user.selectBuilder) return;
			user.allLog = false;
			actions[0].components[1].setDisabled(false);
			actions[0].components[2].setDisabled(true);
			if (user.enemy) {
				user.selectBuilder
					.setFields([
						{
							name: `Battle Status`,
							value: `You: ${Utils.Canvas.unicodeProgressBar(user.stats.health, user.stats.health_max)}\nEnemy: ${Utils.Canvas.unicodeProgressBar(user.enemy.stats.health, user.enemy.stats.health_max)}`
						},
						{
							name: `Logs (${user.battleLog.length})`, 
							value: `${((user.battleLog.length >= 4 && !user.allLog) 
								? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) 
								: user.battleLog).join('')
							}`
						}
					])
					.setComponents(actions)
					.addComponents(new MessageSelectMenu().setCustomId('swap').setPlaceholder('swap weapon to ...').addOptions(user.inventory.items.filter((e) => Items.find(e.id) instanceof Weapon).map((stack) => ({
						label: Items.find(stack.id)?.name,
						value: `${stack.id}`,
					}))));
			}
		}, 'button', {style: 'SECONDARY'} as InteractionButtonOptions)
	],
	[
		new EventSelection('swap', (user, actions, interactionCallback) => {
			if (interactionCallback.isSelectMenu()) {
				const id = Number(interactionCallback.values[0]);
				const weapon = Items.find(id);
				const entity = user.inventory.items.find((e) => e.id == id);
				const weaponFrom = ItemStack.getItem(user.inventory.weapon).localName(user);
				const weaponTo = weapon.localName(user);
				if(!user.selectBuilder || !entity || !user.enemy) return;
				
				entity.amount--;
				if (!entity.amount) user.inventory.items.splice(user.inventory.items.indexOf(entity), 1);

				user.inventory.weapon.id = weapon.id;
				user.giveItem(weapon);
				user.battleLog.push(`\`\`\`\n${Bundle.format(user.lang, 'switch_change', weaponTo, weaponFrom)}\n\`\`\``);
				user.selectBuilder.setFields([
					{
						name: `Battle Status`,
						value: `You: ${Utils.Canvas.unicodeProgressBar(user.stats.health, user.stats.health_max)}\nEnemy: ${Utils.Canvas.unicodeProgressBar(user.enemy.stats.health, user.enemy.stats.health_max)}`
					},
					{
						name: `Logs (${user.battleLog.length})`, 
						value: `${((user.battleLog.length >= 4 && !user.allLog) 
							? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) 
							: user.battleLog).join('')
						}`
					}
				])
			
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

function battleEnd(user: User) {
	if(!user.enemy) throw new Error("enemy unit is not exist!");
	const unit = Units.find(user.enemy.id);
	if(!user.selectBuilder) throw new Error("msg builder is not exist!");
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
		user.selectBuilder.setFields([
			{
				name: `Battle Status`,
				value: `You: ${Utils.Canvas.unicodeProgressBar(user.stats.health, user.stats.health_max)}\nEnemy: ${Utils.Canvas.unicodeProgressBar(user.enemy.stats.health, user.enemy.stats.health_max)}`
			},
			{
				name: `Logs (${user.battleLog.length})`, 
				value: `${((user.battleLog.length >= 4 && !user.allLog) 
					? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) 
					: user.battleLog).join('')
				}`
			},
			{
				name: 'Battle End', 
				value: 
				`\`\`\`ini\n[${Bundle.format(user.lang, 'battle.result', user.exp, user.exp += unit.level * (1 + unit.ratio) * 10, items.map((i) => `${i.item.localName(user)} +${i.amount} ${Bundle.find(user.lang, 'unit.item')}`).join('\n'))}
				\n${items.map((i) => user.giveItem(i.item)).filter((e) => e).join('\n')}]\`\`\``
			}
		]);
	}
	else if(user.stats.health <= 0) {
		user.stats.health = 0.1 * user.stats.health_max;
		user.battleLog.push(`\`\`\`diff\n- ${Bundle.format(user.lang, 'battle.lose', user.stats.health.toFixed(2))}\n\`\`\``);

		//임베드에 전투 결과 메시지 추가
		user.selectBuilder.setFields([
			{
				name: `Battle Status`,
				value: `You: ${Utils.Canvas.unicodeProgressBar(user.stats.health, user.stats.health_max)}\nEnemy: ${Utils.Canvas.unicodeProgressBar(user.enemy.stats.health, user.enemy.stats.health_max)}`
			},
			{
				name: `Logs (${user.battleLog.length})`, 
				value: `${((user.battleLog.length >= 4 && !user.allLog) 
					? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) 
					: user.battleLog).join('')
				}`
			}
		]);
	}
	else throw new Error("battle is ended with no-one-dead");
	
	//유저데이터 초기화 및 저장
	if(user.battleInterval) clearInterval(user.battleInterval);
	user.battleInterval = undefined;
	user.enemy = undefined;
	user.battleLog = [];
	user.status.clearSelection();
	user.selectBuilder.setComponents([]);
	user.selectBuilder = undefined;
	save();
}

export function battle(user: User, entity: UnitEntity) {
	if(!user.selectBuilder) throw new Error("msg builder is not exist!");
	
	//update user data
	user.enemy = entity; 
	user.battleLog = [];

	const data = SelectEvent.toActionData(battleSelection, user);
	
	user.selectBuilder
		.setDescription(Bundle.format(user.lang, 'battle.start', user.id, Units.find(user.enemy.id).localName(user)))
		.setComponents(data.actions).setTriggers(data.triggers);

	const weapon: Weapon | undefined = Items.find<Weapon>(user.enemy.items.weapon.id);
	if (weapon) {
		user.battleInterval = setInterval(() => {
			if (!user.enemy || !user.selectBuilder) return;
			if (user.stats.health <= 0) return battleEnd(user);

			user.enemy.cooldown -= 100 / 1000;
			if (user.enemy.cooldown <= 0 && user.enemy.stats.health > 0) {
				user.enemy.cooldown = weapon.cooldown;
				user.battleLog.push(`\`\`\`diff\n- ${weapon.attackEntity(user)}\n\`\`\``);
				user.selectBuilder.setFields([
					{
						name: `Battle Status`,
						value: `You: ${Utils.Canvas.unicodeProgressBar(user.stats.health, user.stats.health_max)}\nEnemy: ${Utils.Canvas.unicodeProgressBar(user.enemy.stats.health, user.enemy.stats.health_max)}`
					},
					{
						name: `Logs (${user.battleLog.length})`, 
						value: `${((user.battleLog.length >= 4 && !user.allLog) 
							? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) 
							: user.battleLog).join('')
						}`
					}
				]);
				user.selectBuilder.interaction.editReply({ embeds: [user.selectBuilder] }); 
			}
		}, 100);
	}
}