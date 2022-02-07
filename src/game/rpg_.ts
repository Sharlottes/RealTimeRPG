import { SlashCommandBuilder } from '@discordjs/builders';
import Discord, {
	CacheType, InteractionButtonOptions, MessageActionRow, MessageActionRowComponent, MessageActionRowComponentResolvable, MessageButton, MessageButtonOptions, MessageEmbed, MessageSelectMenu, MessageSelectMenuOptions, MessageSelectOptionData,
} from 'discord.js';

import { ITrigger, PagesBuilder } from 'discord.js-pages';
import { change, create, remove, signin, signout, Status, User } from '../modules';
import { Utils } from '../util';
import { Entity, Items, Units, Weapon } from '.';
import { Unit, Item, ItemStack } from './contents';
import { Consumable, Durable } from '@뇌절봇/@type';
import Assets from '../assets';
import { Message } from '..';
import {
	BaseEvent, EventSelection, SelectEvent,
} from '../event';

import CM from '../commands';

type UnitEntity = Entity.UnitEntity;

const Bundle = Assets.bundle;
const { UnitEntity } = Entity;
const { Mathf } = Utils;
const { Database } = Utils;
const prefix = '/';
const users: User[] = read();

const latestMsgs: LatestMsg[] = [];

type LatestMsg = {
  user: User,
  msg: Message
};

export interface Rationess {
	getRatio(): number;
}

function statusCmd(user: User) {
	const msg = findMessage(user);
	if(!msg) return;
	const targetid = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('target', false);
	const target = targetid ? users.find((u) => u.id == targetid) : user;
	if (targetid && !target) { return msg.interaction.followUp(Bundle.format(user.lang, 'account.account_notFound', targetid)); }
	msg.interaction.followUp(getUserInfo(target as User));
}

function inventoryCmd(user: User) {
	const msg = findMessage(user);
	if(!msg) return;
	const targetid = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('target', false);
	const target = targetid ? users.find((u) => u.id == targetid) : user;
	if (targetid && !target) { return msg.interaction.followUp(Bundle.format(user.lang, 'account.account_notFound', targetid)); }
	msg.interaction.followUp(getInventory(target as User));
}

function consumeCmd(user: User) {
	const msg = findMessage(user);
	if(!msg) return;
	const name = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('target', true);
	if (!name) return msg.interaction.followUp(prefix + Bundle.find(user.lang, 'command.consume_help'));

	const stack: ItemStack | undefined = user.inventory.items.find((i) => ItemStack.getItem(i).localName(user) == name);
	if (!stack) return msg.interaction.followUp(Bundle.format(user.lang, 'account.notFound', name));
	const result = ItemStack.consume(stack, user);
	if (result) msg.interaction.followUp(result);
	save();
}

function weaponChangeCmd(user: User) {
	const msg = findMessage(user);
	if(!msg) return;
	const weapon = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('target', true);
	if (!weapon) msg.interaction.followUp(prefix + Bundle.find(user.lang, 'command.swap_help'));
	else switchWeapon(user, msg, weapon);
}

function walkingCmd(user: User) {
	const msg = findMessage(user);
	if(msg) {
		if (user.status.name !== 'selecting') {
			if (user.stats.energy >= 7) {
				user.countover = 0;
				user.stats.energy -= 7;
				getOne(eventData).start(user);
			} else {
				if (user.countover >= 3) {
					msg.interaction.followUp(Bundle.find(user.lang, 'calmdown'));
				} else {
					user.countover++;
					msg.interaction.followUp(Bundle.format(user.lang, 'notEnergy', user.stats.energy.toFixed(1), 7));
				}
			}
			save();
		}
		else (msg.interaction as Discord.CommandInteraction<CacheType>)?.followUp('you cannot walk while selecting!');
	}
}

function contentInfoCmd(user: User) {
	const msg = findMessage(user);
	if(!msg) return;
	const type = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('type', false);
	const showAll = type !== 'item' && type !== 'unit';
	let infoes: string[] = [];
	const out = [];

	if (showAll || type === 'unit') infoes = infoes.concat(Units.getUnits().map((cont) => `\`\`\`${info(user, cont)}\`\`\``));
	if (showAll || type === 'item') infoes = infoes.concat(Items.getItems().map((cont) => `\`\`\`${info(user, cont)}\`\`\``));

	for (let i = 0; i < Math.floor(infoes.length / 4); i++) { out.push(infoes.slice(i * 4, Math.min(infoes.length, (i + 1) * 4))); }
	new PagesBuilder(msg.interaction).setPages(out.map((infoes) => new MessageEmbed().setDescription(infoes.join('')))).setDefaultButtons(['back', 'next']).build();
}

function registerCmd(builder: SlashCommandBuilder, callback: (user: User) => void, requireUser?: boolean): void;
function registerCmd(builder: SlashCommandBuilder, callback: (msg: Message) => void, requireUser?: boolean): void;
function registerCmd(builder: SlashCommandBuilder, callback: ((user: User)=>void)|((msg: Message)=>void), requireUser?: boolean) {
	CM.register({
		category: 'guild',
		dmOnly: false,
		debug: false,
		run: (interaction) => {
			const msg = {
				interaction,
				builder: null,
			};
			const user = users.find((u) => u.hash == parseInt(interaction.user.id));
			if (requireUser && !user) { 
				interaction.followUp(Bundle.find((interaction.locale as Assets.bundle.language) || 'en', 'account.account_notLogin')); 
			} else {
				if (user) {
					const exist = latestMsgs.find(l=>l.user==user);
					if(exist) exist.msg = msg;
					else latestMsgs.push({
						user: user,
						msg: msg,
					});

					(callback as (msg: User)=>void)(user);
				} 
				else (callback as (msg: Message)=>void)(msg)
			}
		},
		setHiddenConfig: (arg) => arg,
		builder,
	});
}

export function init() {
	users.forEach((user) => {
		if (!user.foundContents.get) user.foundContents = new Map().set('item', user.inventory.items.map((i) => i.id)).set('unit', []);
		if (!user.foundContents.get('item')) user.foundContents.set('item', []);
		if (!user.foundContents.get('unit')) user.foundContents.set('unit', []);
		if (user.stats.health <= 0) user.stats.health = user.stats.health_max;
		user.inventory.items.forEach((entity, i) => {
			const exist = user.inventory.items.find((e) => e != entity && e.id == entity.id);
			if (exist) {
				exist.amount += entity.amount;
				user.inventory.items.splice(i, 1);
			}
		});
	});
	Items.init();
	Units.init();

	registerCmd(new SlashCommandBuilder().setName('reset').setDescription('remove current selection so that you can do walk'), (user: User) => {
		user.status.clearSelection();
		findMessage(user)?.interaction.followUp('selection is removed successfully!');
	});
	registerCmd((() => {
		const s = new SlashCommandBuilder().setName('status').setDescription('show your or someone\'s own status');
		s.addStringOption((option) => {
			option.setName('target').setDescription('target user id');
			if (users.length <= 25) option.addChoices(users.map((u) => [u.id, u.id]));

			return option;
		});
		return s;
	})(), statusCmd);
	registerCmd((() => {
		const s = new SlashCommandBuilder().setName('inventory').setDescription('show your or someone\'s own inventory');
		s.addStringOption((option) => {
			option.setName('target').setDescription('target user id');
			if (users.length <= 25) option.addChoices(users.map((u) => [u.id, u.id]));

			return option;
		});
		return s;
	})(), inventoryCmd);
	registerCmd((() => {
		const s = new SlashCommandBuilder().setName('consume').setDescription('consume item');
		s.addStringOption((option) => option.setName('target').setDescription('target item name').setRequired(true).addChoices(Items.getItems().filter((i) => (i as unknown as Consumable).consume).map((u) => [u.localName(), u.localName()])));
		return s;
	})(), consumeCmd);
	registerCmd((() => {
		const s = new SlashCommandBuilder().setName('swap').setDescription('swap the weapon');
		s.addStringOption((option) => option.setName('target').setDescription('target weapon name').setRequired(true).addChoices(Items.getItems().filter((i) => (i as unknown as Weapon).damage).map((u) => [u.localName(), u.localName()])));
		return s;
	})(), weaponChangeCmd);
	registerCmd((() => {
		const s = new SlashCommandBuilder().setName('info').setDescription('show content information');
		s.addStringOption((option) => option.setName('type').setDescription('the content type').addChoices([['item', 'item'], ['unit', 'unit']]));
		return s;
	})(), contentInfoCmd);
	registerCmd(new SlashCommandBuilder().setName('walk').setDescription('just walk around'), walkingCmd);
	registerCmd(new SlashCommandBuilder().setName('accounts').setDescription('show all accounts'), (msg: Message) => msg.interaction.followUp(users.map((u) => u.id).join(' | ')));
	registerCmd(new SlashCommandBuilder().setName('signout').setDescription('sign current account out'), (msg: Message) => signout(msg, users), true);
	registerCmd((() => {
		const s = new SlashCommandBuilder().setName('register').setDescription('register new account');
		s.addStringOption((option) => option.setRequired(true).setName('id').setDescription('account id'));
		s.addStringOption((option) => option.setRequired(true).setName('pw').setDescription('account passward'));
		return s;
	})(), (msg: Message) => create(msg, users), false);
	registerCmd((() => {
		const s = new SlashCommandBuilder().setName('remove').setDescription('remove current account and sign out');
		s.addStringOption((option) => option.setRequired(true).setName('id').setDescription('account id'));
		s.addStringOption((option) => option.setRequired(true).setName('pw').setDescription('account passward'));
		return s;
	})(), (msg: Message) => remove(msg, users), true);
	registerCmd((() => {
		const s = new SlashCommandBuilder().setName('signin').setDescription('sign existed account in');
		s.addStringOption((option) => option.setRequired(true).setName('id').setDescription('account id'));
		s.addStringOption((option) => option.setRequired(true).setName('pw').setDescription('account passward'));
		return s;
	})(), (msg: Message) => signin(msg, users), false);
	registerCmd((() => {
		const s = new SlashCommandBuilder().setName('change').setDescription('change passward or id');
		s.addStringOption((option) => option.setRequired(true).setName('type').setDescription('id or passward').addChoices([['id', 'id'], ['pw', 'pw']]));
		s.addStringOption((option) => option.setRequired(true).setName('id').setDescription('account id'));
		s.addStringOption((option) => option.setRequired(true).setName('pw').setDescription('account passward'));
		s.addStringOption((option) => option.setRequired(true).setName('target').setDescription('new id/pw'));
		return s;
	})(), (msg: Message) => change(msg, users), true);
	console.log('init done');
	// save();
}

const battleSelection: EventSelection[][] = [
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
						`${Bundle.format(user.lang, 'battle.start', user.id, unit.localName(user))}
						\n${((user.battleLog.length >= 4 && !user.allLog) ? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) : user.battleLog).join('')}
						\n\`\`\`diff\n+ ${target.health < 0 ? `${Bundle.find(user.lang, 'battle.overkill')} ` : ''}${Bundle.format(user.lang, 'battle.win', target.health.toFixed(2))}
						\`\`\`` + 
						`\n\`\`\`ini\n[${Bundle.format(user.lang, 'battle.result', user.exp, user.exp += unit.level * (1 + unit.rare) * 10, items.map((i) => `${i.item.localName(user)} +${i.amount} ${Bundle.find(user.lang, 'unit.item')}`).join('\n'))}
						\n${items.map((i) => giveItem(user, i.item)).filter((e) => e).join('\n')}]\`\`\``
					);
					msg.interaction.editReply({ embeds: [msg.builder], components: [] });

					//유저데이터 초기화 및 저장
					user.enemy = undefined;
					msg.builder = null;
					user.battleLog = [];
					user.status.clearSelection();
					save();
					return;
				}
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
				msg.interaction.editReply({ embeds: [msg.builder] });
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
				msg.interaction.editReply({ embeds: [msg.builder] });
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
				giveItem(user, weapon);
				user.battleLog.push(`\`\`\`\n${Bundle.format(user.lang, 'switch_change', weaponTo, weaponFrom)}\n\`\`\``);
				if (user.enemy) msg.builder?.setDescription(`${Bundle.format(user.lang, 'battle.start', user.id, Units.find(user.enemy.id).localName(user))}\n${(user.allLog || user.battleLog.length <= 4) ? '' : `\`\`\`+ ${user.battleLog.length}logs\`\`\`\n`}${((user.battleLog.length >= 4 && !user.allLog) ? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) : user.battleLog).join('')}`);
				if (msg.builder) msg.interaction.editReply({ embeds: [msg.builder] });
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

function exchange(user: User, entity: UnitEntity) {
	const msg = findMessage(user);
	if(!msg || !msg.builder) return;

	//고블린 인벤토리 생성
	for (let i = 0; i < 20; i++) {
		const item = getOne(Items.getItems().filter((i) => i.dropableOnShop() && i.id !== 5 && (typeof i)));
		const exist = entity.items.items.find((e) => e.id == item.id);
		if (exist) exist.amount++;
		else entity.items.items.push(new ItemStack(item.id, 1, (item as unknown as Durable).durability));
	}
	user.enemy = entity;

	const data = SelectEvent.toActionData(exchangeSelection, user);

	//임베드 출력
	msg.builder
		.setDescription(Bundle.find(user.lang, 'event.goblin_exchange'))
		.setComponents(data.actions).setTriggers(data.triggers);
	msg.interaction.editReply({ embeds: [msg.builder], components: data.actions });
}

function battle(user: User, entity: UnitEntity) {
	const msg = findMessage(user);
	if(!msg || !msg.builder) return;

	//적 유닛 갱신 및 전투로그 초기화
	user.enemy = entity;
	user.battleLog = [];

	const data = SelectEvent.toActionData(battleSelection, user);
	

	msg.builder
		.setDescription(Bundle.format(user.lang, 'battle.start', user.id, Units.find(entity.id).localName(user)))
		.setComponents(data.actions).setTriggers(data.triggers);
	msg.interaction.editReply({ embeds: [msg.builder], components: data.actions });


	if (Items.find(entity.items.weapon.id)) {
		const interval: NodeJS.Timeout = setInterval((entity) => {
			if (!msg.builder) return clearInterval(interval);

			entity.cooldown -= 100 / 1000;
			if (entity.cooldown <= 0) {
				entity.cooldown = Items.find<Weapon>(entity.items.weapon.id).cooldown;
				user.battleLog.push(`\`\`\`diff\n- ${Items.find<Weapon>(entity.items.weapon.id).attackEntity(user)}\n\`\`\``);
				const logs = (user.battleLog.length >= 4 && !user.allLog) ? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) : user.battleLog;
				msg.builder.setDescription(`
					${Bundle.format(user.lang, 'battle.start', user.id, Units.find(entity.id).localName(user))}\n
					${(user.allLog || user.battleLog.length <= 4) ? '' : `\`\`\`+ ${user.battleLog.length}logs\`\`\`\n`}
					${logs.join('')}`);
				msg.interaction.editReply({ embeds: [msg.builder] }); // 다른 스레드에서 실행되니 임베드를 업데이트
			}

			if (user.stats.health <= 0 || !user.enemy) {
				if (user.stats.health <= 0) {
					msg.builder.setDescription(`${Bundle.format(user.lang, 'battle.start', user.id, Units.find(entity.id).localName(user))}\n${((user.battleLog.length >= 4 && !user.allLog) ? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) : user.battleLog).join('')}\n` + `\`\`\`diff\n- ${Bundle.format(user.lang, 'battle.lose', user.stats.health.toFixed(2))}\n\`\`\``);
					user.stats.health = 0.1 * user.stats.health_max;
				}
				clearInterval(interval);
				msg.interaction.editReply({ embeds: [msg.builder], components: [] });
				user.enemy = undefined;
				msg.builder = null;
				user.battleLog = [];
				user.status.clearSelection();
			}
		}, 100, entity);
	}
}

export function giveItem(user: User, item: Item, amount = 1): string | null {
	const exist = user.inventory.items.find((i) => ItemStack.equals(i, item));
	if (exist) exist.amount += amount;
	else user.inventory.items.push(new ItemStack(item.id, amount, (item as unknown as Durable).durability));

	if (!user.foundContents.get('item')?.includes(item.id)) {
		user.foundContents.get('item')?.push(item.id);
		save();
		return Bundle.format(user.lang, 'firstget', item.localName(user));
	}

	save();
	return null;
}

const backSelection = (selection: EventSelection[][]) => new EventSelection('backSelect', (user, components, interactionCallback)=> {
	const msg = findMessage(user);
	if(!msg || !msg.builder) return;
	const data = SelectEvent.toActionData(selection, user);

	msg.builder.setComponents(data.actions).setTriggers(data.triggers);
	msg.interaction.editReply({ embeds: [msg.builder], components: data.actions });
}, 'button', {
	style: 'SECONDARY'
} as MessageButtonOptions);

const exchangeSelection: EventSelection[][] = [[
	new EventSelection('buy', (user) => {
		if (!user.enemy) return;

		const out = []; // 1열에 버튼 4개씩
		for (let i = 0; i < Math.floor(user.enemy.items.items.length / 4); i++) {
			out.push(user.enemy.items.items.slice(i * 4, Math.min(user.enemy.items.items.length, (i + 1) * 4)));
		}

		const triggers: ITrigger<MessageActionRowComponent>[] = [];
		const buttons = out.map((items, ii) => new MessageActionRow().setComponents((items.map((entity, i) => {
			const ent = user.enemy?.items.items.find((e) => e.id == entity.id);
			if (!ent) return;

			const item = ItemStack.getItem(ent);
			const money = item.cost * 25;

			triggers.push({
				name: `${item.localName(user)}${i}${ii}`,
				callback(interactionCallback, button) {
					const msg = findMessage(user);
					if(!msg) return;
					buttons.slice(0, Math.min(buttons.length - 1, buttons.length - 2)).forEach((b) => b.components.forEach((bb) => bb.setDisabled(true)));
					buttons[buttons.length - 1].components.forEach((b) => b.setDisabled(false));
					user.status.callback = (amount: number) => {
						if (!user.enemy) return;

						buttons.slice(0, Math.min(buttons.length - 1, buttons.length - 2)).forEach((b) => b.components.forEach((bb) => bb.setDisabled(false)));
						buttons[buttons.length - 1].components.forEach((b) => b.setDisabled(true));
						user.status.callback = undefined;
						if (amount > ent.amount) { msg.builder?.setDescription(`${msg.builder.description}\`\`\`diff\n- ${Bundle.format(user.lang, 'shop.notEnough_item', item.localName(user), amount, ent.amount)}\`\`\``); } else if (user.money < amount * money) { msg.builder?.setDescription(`${msg.builder.description}\`\`\`diff\n- ${Bundle.format(user.lang, 'shop.notEnough_money', amount * money, user.money)}\`\`\``); } else {
							msg.builder?.setDescription(`${msg.builder.description}\`\`\`diff\n+ ${Bundle.format(user.lang, 'shop.buyed', item.localName(user), amount, user.money, (user.money -= money * amount))}\`\`\``);
							ent.amount -= amount;
							(button.setCustomId(`${item.localName(user)}${i}${ii}`) as Discord.MessageButton).setLabel(`${item.localName(user)}: ${money + Bundle.format(user.lang, 'unit.money')} (${ent.amount + Bundle.format(user.lang, 'unit.item')} ${Bundle.format(user.lang, 'unit.item_left')})`).setStyle('PRIMARY');

							const isNew = giveItem(user, item, amount);
							if (isNew) msg.builder?.setDescription(`${msg.builder.description}\`\`\`diff\n+ ${isNew}\`\`\``);
							if (!ent.amount) user.enemy.items.items.splice(i, 1);
							save();
						}

						if (msg.builder) msg.interaction.editReply({ components: buttons, embeds: [msg.builder] });
					};
				},
			});
			return new MessageButton().setCustomId(`${item.localName(user)}${i}${ii}`).setLabel(`${item.localName(user)}: ${money + Bundle.format(user.lang, 'unit.money')} (${ent.amount + Bundle.format(user.lang, 'unit.item')} ${Bundle.format(user.lang, 'unit.item_left')})`).setStyle('PRIMARY');
		}) as MessageActionRowComponentResolvable[]).filter((e) => e)));
		
		const back = SelectEvent.toActionData([[backSelection(exchangeSelection)]], user);
		findMessage(user)?.builder?.setComponents(buttons).setTriggers(triggers).addComponents(back.actions).addTriggers(back.triggers)
			.addComponents(new MessageSelectMenu().setCustomId('selectBuy').setPlaceholder('1 items').addOptions(new Array(10).fill(0).map((e, i) => ({
				label: `${i + 1} items`,
				value: `${i + 1}`,
			})))
				.setDisabled(true))
			.addTriggers({
				name: 'selectBuy',
				callback(interactionCallback, select) {
					if (interactionCallback.isSelectMenu()) user.status.callback?.call(null, Number(interactionCallback.values[0]));
				},
			});
	}),
	new EventSelection('sell', (user) => {
			const out = []; // 1열에 버튼 4개씩
			for (let i = 0; i < Math.floor(user.inventory.items.length / 4); i++) {
				out.push(user.inventory.items.slice(i * 4, Math.min(user.inventory.items.length, (i + 1) * 4)));
			}

			const triggers: ITrigger<MessageActionRowComponent>[] = [];
			const buttons = out.map((items, ii) => new MessageActionRow().setComponents((items.map((entity, i) => {
				const ent = user.inventory.items.find((e) => e.id == entity.id);
				if (!ent) return;

				const item = ItemStack.getItem(ent);
				const money = item.cost * 10;

				triggers.push({
					name: `${item.localName(user)}${i}${ii}`,
					callback(interactionCallback, button) {
						buttons.slice(0, Math.min(buttons.length - 1, buttons.length - 2)).forEach((b) => b.components.forEach((bb) => bb.setDisabled(true)));
						buttons[buttons.length - 1].components.forEach((b) => b.setDisabled(false));

						user.status.callback = (amount: number) => {
							const msg = findMessage(user);
							if(!msg) return;
							buttons.slice(0, Math.min(buttons.length - 1, buttons.length - 2)).forEach((b) => b.components.forEach((bb) => bb.setDisabled(false)));
							buttons[buttons.length - 1].components.forEach((b) => b.setDisabled(true));
							user.status.callback = undefined;

							if (amount > ent.amount) { msg.builder?.setDescription(`${msg.builder.description}\`\`\`diff\n- ${Bundle.format(user.lang, 'shop.notEnough_item', item.localName(user), amount, ent.amount)}\`\`\``); } else {
								msg.builder?.setDescription(`${msg.builder.description}\`\`\`diff\n+ ${Bundle.format(user.lang, 'shop.sold', item.localName(user), amount, user.money, (user.money += money * amount))}\`\`\``);
								ent.amount -= amount;
								if (!ent.amount) user.inventory.items.splice(i, 1);
								(button.setCustomId(`${item.localName(user)}${i}${ii}`) as Discord.MessageButton).setLabel(`${item.localName(user)}: ${money + Bundle.format(user.lang, 'unit.money')} (${ent.amount + Bundle.format(user.lang, 'unit.item')} ${Bundle.format(user.lang, 'unit.item_left')})`).setStyle('PRIMARY');
								save();
							}

							if (msg.builder) msg.interaction.editReply({ components: buttons, embeds: [msg.builder] });
						};
					},
				});
				return new MessageButton().setCustomId(`${item.localName(user)}${i}${ii}`).setLabel(`${item.localName(user)}: ${money + Bundle.format(user.lang, 'unit.money')} (${ent.amount + Bundle.format(user.lang, 'unit.item')} ${Bundle.format(user.lang, 'unit.item_left')})`).setStyle('PRIMARY');
			}) as MessageActionRowComponentResolvable[]).filter((e) => e)));
			
			const back = SelectEvent.toActionData([[backSelection(exchangeSelection)]], user);
			findMessage(user)?.builder?.setComponents(buttons).setTriggers(triggers).addComponents(back.actions).addTriggers(back.triggers)
				.addComponents(new MessageSelectMenu().setCustomId('selectSell').setPlaceholder('1 items').addOptions(new Array(10).fill(0).map((e, i) => ({
					label: `${i + 1} items`,
					value: `${i + 1}`,
				})))
					.setDisabled(true))
				.addTriggers({
					name: 'selectSell',
					callback(interactionCallback, select) {
						if (interactionCallback.isSelectMenu()) user.status.callback?.call(null, Number(interactionCallback.values[0]));
					},
				});
	}),
	new EventSelection('back', (user) => {
		const msg = findMessage(user);
		if(!msg || !msg.builder) return;
		msg.builder.setDescription(`${msg.builder.description}\n\`\`\`\n${Bundle.find(user.lang, 'shop.end')}\n\`\`\``);
		msg.interaction.editReply({ embeds: [msg.builder], components: [] });
		user.status.clearSelection();
		user.enemy = undefined;
		msg.builder = null;
	})
]];

const eventData: BaseEvent[] = [
	new BaseEvent(2.5, 'battle.ignore'),
	new BaseEvent(20, '', (user) => {
		const msg = findMessage(user);
		if(!msg) return;
		const money = 2 + Math.floor(Math.random() * 10);
		user.money += money;
		msg.interaction.followUp(Bundle.format(user.lang, 'event.money', money));
	}),

	new BaseEvent(30, '', (user) => {
		const msg = findMessage(user);
		if(!msg) return;
		const item = getOne(Items.getItems().filter((i) => i.dropableOnWalking()));
		msg.interaction.followUp(`${Bundle.format(user.lang, 'event.item', item.localName(user))}\n${giveItem(user, item) || ''}`);
	}),
	new SelectEvent(
		10,
		'event.goblin',
		[[
			new EventSelection('run', (user) => {
				const msg = findMessage(user);
				if(!msg) return;
				if (Mathf.randbool()) {
					const money = Math.floor(Mathf.range(2, 10));
					user.money -= money;
					msg.interaction.followUp(Bundle.format(user.lang, 'event.goblin_run_failed', money));
				} else {
					msg.interaction.followUp(Bundle.find(user.lang, 'event.goblin_run_success'));
				}
				user.status.clearSelection();
			}),
			new EventSelection('talking', (user) => {
				const msg = findMessage(user);
				if(!msg) return;

				const money = Math.floor(Mathf.range(2, 5));
				user.money -= money;
				msg.interaction.followUp(Bundle.format(user.lang, 'event.goblin_talking', money));
				user.status.clearSelection();
			}),
			new EventSelection('exchange', (user) => exchange(user, new UnitEntity(Units.find(1))))
		]]
	),
	new SelectEvent(
		20,
		'event.obstruction',
		[[
			new EventSelection('battle', (user) => battle(user, new UnitEntity(Units.find(0)))),
			new EventSelection('run', (user) => {
				const msg = findMessage(user);
				if(!msg) return;
				user.status.clearSelection();
				msg.interaction.editReply({components: []});
				msg.interaction.followUp(Bundle.find(user.lang, 'event.obstruction_run'));
			})
		]]
	),
];

/**
 *
 * @param {array} arr 값을 뽑을 배열
 * @returns arr 배열에서 특정 비율 기반의 랜덤으로 인수 하나를 뽑아 반환
 */
export function getOne<T extends Rationess>(arr: T[]): T {
	let random = Math.random();
	const total = arr.reduce((a, e) => a + e.getRatio(), 0);
	for (const i in arr) {
		random -= arr[i].getRatio() / total;
		if (random < 0) return arr[i];
	}
	return arr[0];
}

/**
 * latestMsgs 배열에서 특정 조건에 부합하는 메시지를 찾습니다. 
 * 검색 인자에 적합한 객체가 없을 경우 undefined를 반환합니다. 있을 경우 메시지를 반환합니다.
 * @param {User | string |  (value: LatestMsg, index: number, obj: LatestMsg[])=>boolean} predicate 최근 메시지 배열에서 메시지를 찾을 기준, string은 id
 * @returns {Message} 조건에 부합하는 가장 최근의 메시지 객체를 반환합니다.
 */
export function findMessage(predicate: (User | string | ((value: LatestMsg, index: number, obj: LatestMsg[])=>boolean))): Message | undefined {
	if(typeof(predicate) === "string") return latestMsgs.find((u) => u.user.id == predicate)?.msg;
	if(typeof(predicate) === "function") return latestMsgs.find(predicate)?.msg;
	else return latestMsgs.find(u=>u.user==predicate)?.msg;
}

function levelup(user: User) {
	const str = Bundle.format(
		user.lang,
		'levelup',
		user.id,
		user.level,
		user.level + 1,
		user.stats.health_max,
		Math.round((user.stats.health_max += user.level ** 0.6 * 5) * 100) / 100,
		user.stats.energy_max,
		Math.round((user.stats.energy_max += user.level ** 0.4 * 2.5) * 100) / 100,
	);
	findMessage(user)?.interaction.followUp(str);
	user.stats.health = user.stats.health_max;
	user.stats.energy = user.stats.energy_max;
	user.level++;
	save();
}

setInterval(() => {
	users.forEach((u) => {
		if (u.cooldown > 0) u.cooldown -= 1 / 100;

		u.stats.energy = Math.min(u.stats.energy_max, u.stats.energy + u.stats.energy_regen / 100);
		u.stats.health = Math.min(u.stats.health_max, u.stats.health + u.stats.health_regen / 100);
	});
}, 10);

function info(user: User, content: Item|Unit) {
	return (
		`${user.foundContents.get(content instanceof Item ? 'item' : 'unit')?.includes(content.id)
			? content.localName(user) : 'unknown'
		}\n${
			user.foundContents.get(content instanceof Item ? 'item' : 'unit')?.includes(content.id)
				? content.description(user) : 'unknown'
		}${content.details(user)
			? `\n------------\n  ${user.foundContents.get(content instanceof Item ? 'item' : 'unit')?.includes(content.id)
				? content.details(user) : 'unknown'}\n------------`
			: ''}`
	);
}

export function getUsers() {
	return users;
}

function getInventory(user: User) {
	return `${Bundle.find(user.lang, 'inventory')}\n-----------\n${user.inventory.items.map((i) => {
		const item = ItemStack.getItem(i);
		return `• ${item.localName(user)} ${i.amount > 0 ? `(${`${i.amount} ${Bundle.find(user.lang, 'unit.item')}`})` : ''}\n   ${item.description(user)}${(item as unknown as Durable).durability ? `(${Bundle.find(user.lang, 'durability')}: ${i.durability}/${(item as unknown as Durable).durability})` : ''}`;
	}).join('\n\n')}`;
}

function getUserInfo(user: User) {
	let weapon: Weapon = ItemStack.getItem(user.inventory.weapon);
	if (!weapon) {
		user.inventory.weapon.id = 5;
		weapon = Items.find(5);
		save();
	}

	return Bundle.format(
		user.lang,
		'status_info',
		user.id,
		user.level,
		user.exp,
		user.level ** 2 * 50,
		user.money,
		user.stats.energy.toFixed(1),
		user.stats.energy_max,
		user.stats.energy_regen,
		user.stats.health.toFixed(1),
		user.stats.health_max,
		user.stats.health_regen,
		weapon.localName(user),
		user.inventory.weapon.durability && weapon.durability
			? `(${Bundle.find(user.lang, 'durability')}: ${user.inventory.weapon.durability}/${weapon.durability})`
			: '',

		weapon.cooldown,
		weapon.damage,
		(weapon.critical_chance * 100).toFixed(2),
		(weapon.critical_ratio * 100).toFixed(2),
	);
}

function switchWeapon(user: User, msg: Message, name: string) {
	const item = Items.getItems().find((i) => i.localName(user) == name) as Weapon | undefined;
	if (!item) msg.interaction.followUp(Bundle.format(user.lang, 'switch_notFound', name));
	else {
		const entity = user.inventory.items.find((entity) => ItemStack.getItem(entity) == item);
		if (!entity) msg.interaction.followUp(Bundle.format(user.lang, 'switch_notHave', name));
		else {
			entity.amount--;
			if (!entity.amount) user.inventory.items.splice(user.inventory.items.indexOf(entity), 1);

			const exist: Item = ItemStack.getItem(user.inventory.weapon);
			if (exist) {
				msg.interaction.followUp(Bundle.format(user.lang, 'switch_change', name, exist.localName(user)));
				const given = giveItem(user, item);
				if (given) msg.interaction.followUp(given);
			} else { msg.interaction.followUp(Bundle.format(user.lang, 'switch_equip', name)); }

			user.inventory.weapon.id = item.id;
			user.inventory.weapon.durability = item.durability;
			save();
		}
	}
}

function read() {
	const users: User[] = Database.readObject<Array<User>>('./Database/user_data');
	return users.map((u) => {
		u.inventory.weapon = ItemStack.from(u.inventory.weapon);
		u.inventory.items.forEach((stack) => stack = ItemStack.from(stack));
		u.status = new Status();
		if (!u.battleLog) u.battleLog = [];
		if (!u.foundContents) u.foundContents = new Map().set('item', u.inventory.items.map((i) => i.id)).set('unit', []);
		return u;
	});
}

function save() {
	users.forEach((user) => {
		if (user.exp > user.level ** 2 * 50) {
			levelup(user);
		}
	});
	Database.writeObject('./Database/user_data', users);
}

init();
