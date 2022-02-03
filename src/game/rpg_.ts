import { SlashCommandBuilder } from '@discordjs/builders';
import Discord, {
	CacheType, MessageActionRow, MessageActionRowComponent, MessageActionRowComponentResolvable, MessageButton, MessageEmbed, MessageSelectMenu,
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
const latestMsgs: LatestMsg[] = [];

const users: User[] = read();

type LatestMsg = {
  id: string,
  msg: Message
};

export interface Rationess {
	getRatio(): number;
}

function statusCmd(msg: Message, user: User) {
	const targetid = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('target', false);
	const target = targetid ? users.find((u) => u.id == targetid) : user;
	if (targetid && !target) { return msg.interaction.followUp(Bundle.format(user.lang, 'account.account_notFound', targetid)); }
	msg.interaction.followUp(getUserInfo(target as User));
}

function inventoryCmd(msg: Message, user: User) {
	const targetid = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('target', false);
	const target = targetid ? users.find((u) => u.id == targetid) : user;
	if (targetid && !target) { return msg.interaction.followUp(Bundle.format(user.lang, 'account.account_notFound', targetid)); }
	msg.interaction.followUp(getInventory(target as User));
}

function consumeCmd(msg: Message, user: User) {
	const name = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('target', true);
	if (!name) return msg.interaction.followUp(prefix + Bundle.find(user.lang, 'command.consume_help'));

	const stack: ItemStack | undefined = user.inventory.items.find((i) => ItemStack.getItem(i).localName(user) == name);
	if (!stack) return msg.interaction.followUp(Bundle.format(user.lang, 'account.notFound', name));
	const result = ItemStack.consume(stack, user);
	if (result) msg.interaction.followUp(result);
	save();
}

function weaponChangeCmd(msg: Message, user: User) {
	const weapon = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('target', true);
	if (!weapon) msg.interaction.followUp(prefix + Bundle.find(user.lang, 'command.swap_help'));
	else switchWeapon(user, msg, weapon);
}

function walkingCmd(msg: Message, user: User) {
	if (user.status.name == 'selecting') return (msg.interaction as Discord.CommandInteraction<CacheType>)?.followUp('you cannot walk while selecting!');
	if (user.stats.energy < 7) {
		if (user.countover >= 3) {
			msg.interaction.followUp(Bundle.find(user.lang, 'calmdown'));
		} else {
			user.countover++;
			msg.interaction.followUp(Bundle.format(user.lang, 'notEnergy', user.stats.energy.toFixed(1), 7));
		}
	} else {
		user.countover = 0;
		search(msg, user);
	}
	save();
}

function contentInfoCmd(msg: Message, user: User) {
	const type = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('type', false);
	const showAll = type !== 'item' && type !== 'unit';
	let infoes: string[] = [];
	const out = [];

	if (showAll || type === 'unit') infoes = infoes.concat(Units.getUnits().map((cont) => `\`\`\`${info(user, cont)}\`\`\``));
	if (showAll || type === 'item') infoes = infoes.concat(Items.getItems().map((cont) => `\`\`\`${info(user, cont)}\`\`\``));

	for (let i = 0; i < Math.floor(infoes.length / 4); i++) { out.push(infoes.slice(i * 4, Math.min(infoes.length, (i + 1) * 4))); }
	new PagesBuilder(msg.interaction).setPages(out.map((infoes) => new MessageEmbed().setDescription(infoes.join('')))).setDefaultButtons(['back', 'next']).build();
}

function registerCmd(builder: SlashCommandBuilder, callback: (msg: Message, user: User) => void, requireUser?: boolean): void;
function registerCmd(builder: SlashCommandBuilder, callback: (msg: Message) => void, requireUser?: boolean): void;
function registerCmd(builder: SlashCommandBuilder, callback: ((msg: Message, user: User)=>void)|((msg: Message)=>void), requireUser?: boolean) {
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
					latestMsgs.push({
						id: user.id,
						msg: msg,
					});
					callback(msg, user)
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

	registerCmd(new SlashCommandBuilder().setName('reset').setDescription('remove current selection so that you can do walk'), (msg: Message, user: User) => {
		user.status.clearSelection();
		msg.interaction.followUp('selection is removed successfully!');
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

const battleSelection: EventSelection[] = [
	{
		name: 'attack',
		callback: (user, msg) => {
			if (!user.enemy || !msg.builder) return;

			const target = user.enemy;
			const weapon: Weapon = ItemStack.getItem(user.inventory.weapon);

			if (user.cooldown > 0) {
				user.battleLog.push(`\`\`\`diff\n+ ${Bundle.format(user.lang, 'battle.cooldown', user.cooldown.toFixed(2))}\n\`\`\``);
			} else { // 쿨다운 끝나면 공격
				user.battleLog.push(`\`\`\`diff\n+ ${weapon.attack(user, target)}\n\`\`\``);

				// 내구도 감소, 만약 내구도가 없거나 0 이하로 내려가면 주먹으로 교체.
				if (user.inventory.weapon.durability) user.inventory.weapon.durability--;
				if ((!user.inventory.weapon.durability || user.inventory.weapon.durability <= 0) && user.inventory.weapon.id !== 5) {
					user.battleLog.push(`\`\`\`diff\n+ ${Bundle.format(user.lang, 'battle.broken', weapon.localName(user))}\n\`\`\``);
					user.inventory.weapon.id = 5;
				}

				// 적이 죽으면 전투 끝
				if (target.health <= 0 && msg.builder) {
					msg.builder.setDescription(
						`${Bundle.format(user.lang, 'battle.start', user.id, Units.find(user.enemy.id).localName(user))
						}\n${((user.battleLog.length >= 4 && !user.allLog) ? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) : user.battleLog).join('')
						}\n\`\`\`diff\n+ ${target.health < 0 ? `${Bundle.find(user.lang, 'battle.overkill')} ` : ''}${Bundle.format(user.lang, 'battle.win', target.health.toFixed(2))}\n\`\`\``
            + `\n\`\`\`ini\n[${battlewin(user, Units.find(target.id))}]\`\`\``,
					);
					msg.interaction.editReply({ embeds: [msg.builder], components: [] });
					user.enemy = undefined;
					msg.builder = null;
					user.battleLog = [];
					user.status.clearSelection();
					return;
				}
			}
			msg.builder.setDescription(`${Bundle.format(user.lang, 'battle.start', user.id, Units.find(user.enemy.id).localName(user))}\n${(user.allLog || user.battleLog.length <= 4) ? '' : `\`\`\`+ ${user.battleLog.length}logs\`\`\`\n`}${((user.battleLog.length >= 4 && !user.allLog) ? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) : user.battleLog).join('')}`);
		},
	},
	{
		name: 'show-logs',
		callback: (user, msg, button) => {
			user.allLog = true;
			if (button) {
				button.components[1].setDisabled(true);
				button.components[2].setDisabled(false);
				if (msg.builder) {
					if (user.enemy) {
						msg.builder
							.setDescription(`${Bundle.format(user.lang, 'battle.start', user.id, Units.find(user.enemy.id).localName(user))}\n${(user.allLog || user.battleLog.length <= 4) ? '' : `\`\`\`+ ${user.battleLog.length}logs\`\`\`\n`}${((user.battleLog.length >= 4 && !user.allLog) ? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) : user.battleLog).join('')}`)
							.setComponents([button])
							.addComponents(new MessageSelectMenu().setCustomId('swap').setPlaceholder('swap weapon to ...').addOptions(user.inventory.items.filter((e) =>  Items.find(e.id) instanceof Weapon).map((stack) => ({
								label: Items.find(stack.id)?.name,
								value: `${stack.id}`,
							}))));
					}
					msg.interaction.editReply({ embeds: [msg.builder] });
				} else msg.interaction.editReply({ components: [] });
			}
		},
		style: 'SECONDARY',
	},
	{
		name: 'hide-logs',
		callback: (user, msg, button) => {
			user.allLog = false;
			if (button) {
				button.components[1].setDisabled(false);
				button.components[2].setDisabled(true);
				if (msg.builder) {
					if (user.enemy) {
						msg.builder
							.setDescription(`${Bundle.format(user.lang, 'battle.start', user.id, Units.find(user.enemy.id).localName(user))}\n${(user.allLog || user.battleLog.length <= 4) ? '' : `\`\`\`+ ${user.battleLog.length}logs\`\`\`\n`}${((user.battleLog.length >= 4 && !user.allLog) ? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) : user.battleLog).join('')}`)
							.setComponents([button])
							.addComponents(new MessageSelectMenu().setCustomId('swap').setPlaceholder('swap weapon to ...').addOptions(user.inventory.items.filter((e) => Items.find(e.id) instanceof Weapon).map((stack) => ({
								label: Items.find(stack.id)?.name,
								value: `${stack.id}`,
							}))));
					}
					msg.interaction.editReply({ embeds: [msg.builder] });
				} else msg.interaction.editReply({ components: [] });
			}
		},
		style: 'SECONDARY',
	},
];

function exchange(msg: Message, user: User, entity: UnitEntity) {
	for (let i = 0; i < 20; i++) {
		const item = getOne<>(Items.getItems().filter((i) => i.dropableOnShop() && i.id !== 5 && (item instanceof Durable)));
		const exist = entity.items.items.find((e) => e.id == item.id);
		if (exist) exist.amount++;
		else entity.items.items.push(new ItemStack(item.id, 1, item.durability));
	}

	user.enemy = entity;

	if (msg.builder) {
		const buttons: MessageActionRow = new MessageActionRow();
		const triggers: ITrigger<MessageActionRowComponent>[] = [];

		exchangeSelection.forEach((select, i) => {
			const name = Assets.bundle.find(user.lang, `select.${select.name}`);
			buttons.addComponents(new MessageButton().setCustomId(name + i).setLabel(name).setStyle('PRIMARY'));
			triggers.push({
				name: name + i,
				callback: (interactionCallback, button) => {
					buttons.components.forEach((c) => c.setDisabled(true));
					select.callback(user, msg);
				},
			});
		});

		msg.builder
			.setDescription(Bundle.find(user.lang, 'event.goblin_exchange'))
			.setComponents(buttons).setTriggers(triggers);
		msg.interaction.editReply({ embeds: [msg.builder], components: [buttons] });
	}
}

function battle(msg: Message, user: User, entity: UnitEntity) {
	const buttons: MessageActionRow = new MessageActionRow();
	user.enemy = entity;
	user.battleLog = [];

	if (msg.builder) {
		const triggers: ITrigger<MessageActionRowComponent>[] = [];

		battleSelection.forEach((select, i) => {
			const name = Assets.bundle.find(user.lang, `select.${select.name}`);
			buttons.addComponents(new MessageButton().setCustomId(name + i).setLabel(name).setStyle(select.style || 'PRIMARY'));
			triggers.push({
				name: name + i,
				callback: () => select.callback(user, msg, buttons),
			});
		});

		msg.builder
			.setDescription(Bundle.format(user.lang, 'battle.start', user.id, Units.find(entity.id).localName(user)))
			.setComponents(buttons).setTriggers(triggers)
			.addComponents(new MessageSelectMenu().setCustomId('swap').setPlaceholder('swap weapon to ...').addOptions(user.inventory.items.filter((e) => Items.find(e.id) instanceof Weapon).map((stack) => ({
				label: Items.find(stack.id)?.name,
				value: `${stack.id}`,
			}))))
			.addTriggers({
				name: 'swap',
				callback(interactionCallback, select) {
					if (interactionCallback.isSelectMenu()) {
						const id = Number(interactionCallback.values[0]);
						const weapon = Items.find(id);
						const entity = user.inventory.items.find((e) => e.id == id);
						const weaponFrom = ItemStack.getItem(user.inventory.weapon).localName(user);
						const weaponTo = weapon.localName(user);

						if (!entity) return;
						entity.amount--;
						if (!entity.amount) user.inventory.items.splice(user.inventory.items.indexOf(entity), 1);

						user.inventory.weapon.id = weapon.id;
						giveItem(user, weapon);
						user.battleLog.push(`\`\`\`\n${Bundle.format(user.lang, 'switch_change', weaponTo, weaponFrom)}\n\`\`\``);
						if (user.enemy) msg.builder?.setDescription(`${Bundle.format(user.lang, 'battle.start', user.id, Units.find(user.enemy.id).localName(user))}\n${(user.allLog || user.battleLog.length <= 4) ? '' : `\`\`\`+ ${user.battleLog.length}logs\`\`\`\n`}${((user.battleLog.length >= 4 && !user.allLog) ? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) : user.battleLog).join('')}`);
						if (msg.builder) msg.interaction.editReply({ embeds: [msg.builder] });
						save();
					}
				},
			});
		msg.interaction.editReply({ embeds: [msg.builder], components: [buttons] });
	}

	if (Items.find(entity.items.weapon.id)) {
		const interval: NodeJS.Timeout = setInterval((entity) => {
			if (!msg.builder) return clearInterval(interval);

			entity.cooldown -= 100 / 1000;
			if (entity.cooldown <= 0) {
				entity.cooldown = Items.find<Weapon>(entity.items.weapon.id).cooldown;
				user.battleLog.push(`\`\`\`diff\n- ${Items.find<Weapon>(entity.items.weapon.id).attackEntity(user)}\n\`\`\``);
				const logs = (user.battleLog.length >= 4 && !user.allLog) ? user.battleLog.slice(Math.max(0, user.battleLog.length - 5), user.battleLog.length) : user.battleLog;
				msg.builder.setDescription(`${Bundle.format(user.lang, 'battle.start', user.id, Units.find(entity.id).localName(user))}\n${(user.allLog || user.battleLog.length <= 4) ? '' : `\`\`\`+ ${user.battleLog.length}logs\`\`\`\n`}${logs.join('')}`);
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

function battlewin(user: User, unit: Unit) {
	const items: { item: Item; amount: number; }[] = [];
	for (let i = 0; i < Math.floor(Mathf.range(unit.level, unit.level * 4)) + 1; i++) {
		const item = getOne(Items.getItems().filter((i) => i.dropableOnBattle()));
		if (item) {
			const obj = items.find((i) => i.item == item);
			if (obj) obj.amount++;
			else items.push({ item, amount: 1 });
		}
	}
	const str = `${Bundle.format(
		user.lang,
		'battle.result',
		user.exp, (
			user.exp += unit.level * (1 + unit.rare) * 10),
		items.map((i) => `${i.item.localName(user)} +${i.amount} ${Bundle.find(user.lang, 'unit.item')}`).join('\n'),
	)
	}\n${items.map((i) => giveItem(user, i.item)).filter((e) => e).join('\n')}`;
	save();
	return str;
}

export function giveItem(user: User, item: Item, amount = 1): string | null {
	const exist = user.inventory.items.find((i) => ItemStack.equals(i, item));
	if (exist) exist.amount += amount;
	else user.inventory.items.push(new ItemStack(item.id, amount, (item as unknown as Durable).getDurability()));

	if (!user.foundContents.get('item')?.includes(item.id)) {
		user.foundContents.get('item')?.push(item.id);
		save();
		return Bundle.format(user.lang, 'firstget', item.localName(user));
	}

	save();
	return null;
}

const exchangeSelection: EventSelection[] = [
	{
		name: 'buy',
		callback: (user, msg) => {
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
			msg.builder?.setComponents(buttons).setTriggers(triggers)
				.addComponents(new MessageActionRow().setComponents(new MessageButton().setCustomId('backkk').setLabel('back').setStyle('SECONDARY')))
				.addTriggers({
					name: 'backkk',
					callback(interactionCallback, button) {
						if (msg.builder) {
							const buttons = new MessageActionRow();
							const triggers: ITrigger<MessageActionRowComponent>[] = [];
							exchangeSelection.forEach((select, i) => {
								const name = Assets.bundle.find(user.lang, `select.${select.name}`);
								buttons.addComponents(new MessageButton().setCustomId(name + i).setLabel(name).setStyle('PRIMARY'));
								triggers.push({
									name: name + i,
									callback: () => select.callback(user, msg),
								});
							});

							msg.builder
								.setDescription(Bundle.find(user.lang, 'event.goblin_exchange'))
								.setComponents(buttons).setTriggers(triggers);
							msg.interaction.editReply({ embeds: [msg.builder], components: [buttons] });
						}
					},
				})
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
		},
	},
	{
		name: 'sell',
		callback: (user, msg) => {
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
			msg.builder?.setComponents(buttons).setTriggers(triggers)
				.addComponents(new MessageActionRow().setComponents(new MessageButton().setCustomId('backkk').setLabel('back').setStyle('SECONDARY')))
				.addTriggers({
					name: 'backkk',
					callback(interactionCallback, button) {
						if (msg.builder) {
							const buttons = new MessageActionRow();
							const triggers: ITrigger<MessageActionRowComponent>[] = [];
							exchangeSelection.forEach((select, i) => {
								const name = Assets.bundle.find(user.lang, `select.${select.name}`);
								buttons.addComponents(new MessageButton().setCustomId(name + i).setLabel(name).setStyle('PRIMARY'));
								triggers.push({
									name: name + i,
									callback: () => select.callback(user, msg),
								});
							});

							msg.builder
								.setDescription(Bundle.find(user.lang, 'event.goblin_exchange'))
								.setComponents(buttons).setTriggers(triggers);
							msg.interaction.editReply({ embeds: [msg.builder], components: [buttons] });
						}
					},
				})
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
		},
	},
	{
		name: 'back',
		callback: (user, msg) => {
			if (msg.builder) {
				msg.builder.setDescription(`${msg.builder.description}\n\`\`\`\n${Bundle.find(user.lang, 'shop.end')}\n\`\`\``);
				msg.interaction.editReply({ embeds: [msg.builder], components: [] });
			}
			user.status.clearSelection();
			user.enemy = undefined;
			msg.builder = null;
		},
	},
];

const eventData: BaseEvent[] = [
	new BaseEvent(2.5, 'battle.ignore'),
	new BaseEvent(20, '', (user, msg) => {
		const money = 2 + Math.floor(Math.random() * 10);
		user.money += money;
		msg.interaction.followUp(Bundle.format(user.lang, 'event.money', money));
	}),

	new BaseEvent(30, '', (user, msg) => {
		const item = getOne(Items.getItems().filter((i) => i.dropableOnWalking()));
		msg.interaction.followUp(`${Bundle.format(user.lang, 'event.item', item.localName(user))}\n${giveItem(user, item) || ''}`);
	}),
	new SelectEvent(
		10,
		'event.goblin',
		[
			{
				name: 'run',
				callback: (user, msg) => {
					if (Mathf.randbool()) {
						const money = Math.floor(Mathf.range(2, 10));
						user.money -= money;
						msg.interaction.followUp(Bundle.format(user.lang, 'event.goblin_run_failed', money));
					} else {
						msg.interaction.followUp(Bundle.find(user.lang, 'event.goblin_run_success'));
					}
					user.status.clearSelection();
				},
			},
			{
				name: 'talking',
				callback: (user, msg) => {
					const money = Math.floor(Mathf.range(2, 5));
					user.money -= money;
					msg.interaction.followUp(Bundle.format(user.lang, 'event.goblin_talking', money));
					user.status.clearSelection();
				},
			},
			{
				name: 'exchange',
				callback: (user, msg) => {
					exchange(msg, user, new UnitEntity(Units.find(1)));
				},
			},
		],
	),
	new SelectEvent(
		20,
		'event.obstruction',
		[
			{
				name: 'battle',
				callback: (user, msg) => battle(msg, user, new UnitEntity(Units.find(0))),
			},
			{
				name: 'run',
				callback: (user, msg) => {
					msg.interaction.followUp(Bundle.find(user.lang, 'event.obstruction_run'));
					user.status.clearSelection();
				},
			},
		],
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
	latestMsgs.find((u) => u.id == user.id)?.msg.interaction.followUp(str);
	user.stats.health = user.stats.health_max;
	user.stats.energy = user.stats.energy_max;
	user.level++;
	save();
}

const inter = setInterval(() => {
	users.forEach((u) => {
		if (u.cooldown > 0) u.cooldown -= 1 / 100;

		u.stats.energy = Math.min(u.stats.energy_max, u.stats.energy + u.stats.energy_regen / 100);
		u.stats.health = Math.min(u.stats.health_max, u.stats.health + u.stats.health_regen / 100);
	});
}, 10);

function search(msg: Message, user: User) {
	getOne(eventData).start(user, msg);
	user.stats.energy -= 7;
}

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
		return `• ${item.localName(user)} ${i.amount > 0 ? `(${`${i.amount} ${Bundle.find(user.lang, 'unit.item')}`})` : ''}\n   ${item.description(user)}${(item as unknown as Durable).getDurability() ? `(${Bundle.find(user.lang, 'durability')}: ${i.durability}/${(item as unknown as Durable).getDurability()})` : ''}`;
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
