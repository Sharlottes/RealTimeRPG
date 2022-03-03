import { InteractionButtonOptions, MessageSelectMenu, MessageSelectMenuOptions, MessageSelectOptionData } from 'discord.js';

import { User } from '../modules';
import { Utils } from '../util';
import { UnitEntity, Items, Units, Weapon } from '.';
import { Item, ItemStack } from './contents';
import Assets from '../assets';
import { EventSelection, SelectEvent } from '../event';

import { findMessage, getOne, save } from './rpg_';

const Bundle = Assets.bundle;
const { Mathf } = Utils;

const battleSelection : EventSelection[][] = [
	[
		new EventSelection('attack', (user) => {
			const msg = findMessage(user);
			if(!msg || !msg.builder || !user.enemy) return;
			const target = user.enemy;
			const weapon: Weapon = ItemStack.getItem(user.inventory.weapon);

			if (user.cooldown > 0) {
				user.battleLog.push(`\`\`\`diff\n+ ${Bundle.format(user.lang, 'battle.cooldown', user.cooldown.toFixed(2))}\n\`\`\``);
			} else {
				// 쿨다운 끝나면 공격
				user.battleLog.push(`\`\`\`diff\n+ ${weapon.attack(user, target)}\n\`\`\``);

				// 내구도 감소, 만약 내구도가 없거나 0 이하로 내려가면 주먹으로 교체.
				if (user.inventory.weapon.durability) user.inventory.weapon.durability--;
				if ((!user.inventory.weapon.durability || user.inventory.weapon.durability <= 0) && user.inventory.weapon.id !== 5) {
					user.battleLog.push(`\`\`\`diff\n+ ${Bundle.format(user.lang, 'battle.broken', weapon.localName(user))}\n\`\`\``);
					user.inventory.weapon.id = 5;
				}

				//임베드에 공격 메시지 추가
				msg.builder.setDescription(`
					${Bundle.format(user.lang, 'battle.start', user.id, Units.find(user.enemy.id).localName(user))}\n
					${(user.allLog || user.battleLog.length <= 4) ? '' : `\`\`\`+ ${user.battleLog.length}logs\`\`\``}\n
					${((user.battleLog.length >= 4 && !user.allLog) ? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) : user.battleLog).join('')}`);

				// 적이 죽으면 전투 끝
				if (target.health <= 0 && msg.builder) {
					const unit = Units.find(user.enemy.id);
					const items: { item: Item; amount: number; }[] = [];

					//전투 보상은 최소 1개, 최대 적 레벨의 4배만큼의 랜덤한 아이템
					for (let i = 0; i < Math.floor(Mathf.range(unit.level, unit.level * 4)) + 1; i++) {
						const item = getOne(Items.getItems().filter((i) => i.dropableOnBattle()));
						const obj = items.find((i) => i.item == item);
						if (obj) obj.amount++;
						else items.push({ item, amount: 1 });
					}

					//임베드에 전투 결과 메시지 추가
					msg.builder.setDescription(
						`
						${Bundle.format(user.lang, 'battle.start', user.id, unit.localName(user))}
						\n${((user.battleLog.length >= 4 && !user.allLog) ? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) : user.battleLog).join('')}
						\`\`\`diff\n+${target.health < 0 ? Bundle.find(user.lang, 'battle.overkill') : ''} ${Bundle.format(user.lang, 'battle.win', target.health.toFixed(2))}\`\`\`
						\`\`\`ini\n[${Bundle.format(user.lang, 'battle.result', user.exp, user.exp += unit.level * (1 + unit.rare) * 10, items.map((i) => `${i.item.localName(user)} +${i.amount} ${Bundle.find(user.lang, 'unit.item')}`).join('\n'))}
						\n${items.map((i) => user.giveItem(i.item)).filter((e) => e).join('\n')}]\`\`\`
						`
					);

					//유저데이터 초기화 및 저장
					msg.builder.setComponents([]);
					msg.builder = null;
					user.enemy = undefined;
					user.battleLog = [];
					user.status.clearSelection();
					save();
					return;
				}
				msg.builder.interaction.editReply({embeds: [msg.builder]});
			} 
		}),
		new EventSelection('show-logs', (user, actions) => {
			const msg = findMessage(user);
			if(!msg) return;
			user.allLog = true;
			actions[0].components[1].setDisabled(true);
			actions[0].components[2].setDisabled(false);
			if (msg.builder) {
				if (user.enemy) {
					msg.builder
						.setDescription(`${Bundle.format(user.lang, 'battle.start', user.id, Units.find(user.enemy.id).localName(user))}\n${(user.allLog || user.battleLog.length <= 4) ? '' : `\`\`\`+ ${user.battleLog.length}logs\`\`\`\n`}${((user.battleLog.length >= 4 && !user.allLog) ? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) : user.battleLog).join('')}`)
						.setComponents(actions)
						.addComponents(new MessageSelectMenu().setCustomId('swap').setPlaceholder('swap weapon to ...').addOptions(user.inventory.items.filter((e) =>  Items.find(e.id) instanceof Weapon).map((stack) => ({
							label: Items.find(stack.id)?.name,
							value: `${stack.id}`,
						}))));
				}
			}
		}, 'button', {style: 'SECONDARY'} as InteractionButtonOptions),
		new EventSelection('hide-logs', (user, actions) => {	
			const msg = findMessage(user);
			if(!msg) return;
			user.allLog = false;
			actions[0].components[1].setDisabled(false);
			actions[0].components[2].setDisabled(true);
			if (msg.builder) {
				if (user.enemy) {
					msg.builder
						.setDescription(`${Bundle.format(user.lang, 'battle.start', user.id, Units.find(user.enemy.id).localName(user))}\n${(user.allLog || user.battleLog.length <= 4) ? '' : `\`\`\`+ ${user.battleLog.length}logs\`\`\`\n`}${((user.battleLog.length >= 4 && !user.allLog) ? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) : user.battleLog).join('')}`)
						.setComponents(actions)
						.addComponents(new MessageSelectMenu().setCustomId('swap').setPlaceholder('swap weapon to ...').addOptions(user.inventory.items.filter((e) => Items.find(e.id) instanceof Weapon).map((stack) => ({
							label: Items.find(stack.id)?.name,
							value: `${stack.id}`,
						}))));
				}
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
				const msg = findMessage(user);
				if(!msg || !entity) return;
				
				entity.amount--;
				if (!entity.amount) user.inventory.items.splice(user.inventory.items.indexOf(entity), 1);

				user.inventory.weapon.id = weapon.id;
				user.giveItem(weapon);
				user.battleLog.push(`\`\`\`\n${Bundle.format(user.lang, 'switch_change', weaponTo, weaponFrom)}\n\`\`\``);
				if (user.enemy && msg.builder) msg.builder.setDescription(`${Bundle.format(user.lang, 'battle.start', user.id, Units.find(user.enemy.id).localName(user))}\n${(user.allLog || user.battleLog.length <= 4) ? '' : `\`\`\`+ ${user.battleLog.length}logs\`\`\`\n`}${((user.battleLog.length >= 4 && !user.allLog) ? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) : user.battleLog).join('')}`);
				save();
			}
		}, 'select', u=>({
				placeholder: 'swap weapon to ...',
				options: u.inventory.items.filter((e) => Items.find(e.id) instanceof Weapon).map((stack) => ({
					label: Items.find(stack.id)?.name,
					value: `${stack.id}`
				} as MessageSelectOptionData))
			} as MessageSelectMenuOptions))
	]
];


export function battle(user: User, entity: UnitEntity) {
	const msg = findMessage(user);
	if(!msg || !msg.builder) return;

	//적 유닛 갱신 및 전투로그 초기화
	user.enemy = entity;
	user.battleLog = [];

	const data = SelectEvent.toActionData(battleSelection, user);
	
	msg.builder
		.setDescription(Bundle.format(user.lang, 'battle.start', user.id, Units.find(entity.id).localName(user)))
		.setComponents(data.actions).setTriggers(data.triggers);

	if (Items.find(entity.items.weapon.id)) {
		const interval: NodeJS.Timeout = setInterval((entity) => {
			if (!msg.builder) return clearInterval(interval);

			entity.cooldown -= 100 / 1000;
			if (entity.cooldown <= 0 && entity.health > 0) {
				entity.cooldown = Items.find<Weapon>(entity.items.weapon.id).cooldown;
				user.battleLog.push(`\`\`\`diff\n- ${Items.find<Weapon>(entity.items.weapon.id).attackEntity(user)}\n\`\`\``);
				const logs = (user.battleLog.length >= 4 && !user.allLog) ? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) : user.battleLog;
				msg.builder.setDescription(`
					${Bundle.format(user.lang, 'battle.start', user.id, Units.find(entity.id).localName(user))}\n
					${(user.allLog || user.battleLog.length <= 4) ? '' : `\`\`\`+ ${user.battleLog.length}logs\`\`\`\n`}
					${logs.join('')}`);
			}

			if (user.stats.health <= 0 || !user.enemy || user.enemy.health <= 0) {
				if (user.stats.health <= 0) {
					msg.builder.setDescription(`${Bundle.format(user.lang, 'battle.start', user.id, Units.find(entity.id).localName(user))}\n${((user.battleLog.length >= 4 && !user.allLog) ? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) : user.battleLog).join('')}\n` + `\`\`\`diff\n- ${Bundle.format(user.lang, 'battle.lose', user.stats.health.toFixed(2))}\n\`\`\``);
					user.stats.health = 0.1 * user.stats.health_max;
				}
				clearInterval(interval);
				return;
			}
			msg.interaction.editReply({ embeds: [msg.builder], components: data.actions }); // 다른 스레드에서 실행되니 임베드를 업데이트
		}, 100, entity);
	}
}