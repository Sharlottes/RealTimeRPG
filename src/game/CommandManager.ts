import { SlashCommandBuilder } from '@discordjs/builders';
import Discord, { CacheType, MessageEmbed } from 'discord.js';

import { PagesBuilder } from 'discord.js-pages';
import { change, create, remove, signin, signout, User } from '../modules';
import { Utils } from '../util';
import { UnitEntity, Items, Units, Weapon, Vars } from '.';
import { Unit, Item, ItemStack } from './contents';
import { Consumable, Message } from '@뇌절봇/@type';
import Assets from '../assets';
import { BaseEvent, EventSelection, SelectEvent } from '../event';

import CM from '../commands';
import { battle } from './BattleManager';
import { exchange } from './ExchangeManager';
import { findMessage, getOne, save } from './rpg_';

const Bundle = Assets.bundle;
const { Mathf } = Utils;

const eventData: BaseEvent[] = [
	new BaseEvent({
		ratio: 20
	}, (user) => {
		const msg = findMessage(user);
		if(!msg) return;
		const money = 2 + Math.floor(Math.random() * 10);
		user.money += money;
		msg.interaction.followUp(Bundle.format(user.lang, 'event.money', money));
	}),

	new BaseEvent({
		ratio: 30
	}, (user) => {
		const msg = findMessage(user);
		if(!msg) return;
		const item = getOne(Items.getItems().filter((i) => i.dropableOnWalking()));
		msg.interaction.followUp(`${Bundle.format(user.lang, 'event.item', item.localName(user))}\n${user.giveItem(item) || ''}`);
	}),
	new SelectEvent({
		ratio: 15,
		title: 'goblin'
	},
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
	new SelectEvent({
		ratio: 20,
		title: 'obstruction',
	},[[
			new EventSelection('battle', (user) => battle(user, new UnitEntity(Units.find(0)))),
			new EventSelection('run', async (user) => {
				const msg = findMessage(user);
				if(!msg || !msg.builder) return;
				
				user.status.clearSelection();
				msg.builder.setComponents([]);
				msg.builder = null;
				msg.interaction.followUp(Bundle.find(user.lang, 'event.obstruction_run'));
			})
		]]
	),
];

function statusCmd(user: User) {
	const msg = findMessage(user);
	if(!msg) return;
	const targetid = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('target', false);
	const target: User | undefined = targetid ? Vars.users.find((u) => u.id == targetid) : user;
	if (!target) return msg.interaction.followUp(Bundle.format(user.lang, 'account.account_notFound', targetid));
	target.getUserInfo(msg);
}

function inventoryCmd(user: User) {
	const msg = findMessage(user);
	if(!msg) return;
	const targetid = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('target', false);
	const target: User | undefined = targetid ? Vars.users.find((u) => u.id == targetid) : user;
	if (!target) return msg.interaction.followUp(Bundle.format(user.lang, 'account.account_notFound', targetid));
	msg.interaction.followUp(target.getInventory());
}

function consumeCmd(user: User) {
	const msg = findMessage(user);
	if(!msg) return;
	const name = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('target', true);
	if (!name) return msg.interaction.followUp(Vars.prefix + Bundle.find(user.lang, 'command.consume_help'));

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
	if (!weapon) msg.interaction.followUp(Vars.prefix + Bundle.find(user.lang, 'command.swap_help'));
	else user.switchWeapon(msg, weapon);
}

function walkingCmd(user: User) {
	const msg = findMessage(user);
	if(!msg) return;

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

function registerCmd(builder: SlashCommandBuilder, callback: (user: User) => void, requireUser?: boolean, ignoreSelection?: boolean): void;
function registerCmd(builder: SlashCommandBuilder, callback: (msg: Message) => void, requireUser?: boolean, ignoreSelection?: boolean): void;
function registerCmd(builder: SlashCommandBuilder, callback: ((user: User)=>void)|((msg: Message)=>void), requireUser = false, ignoreSelection = false) {
	CM.register({
		category: 'guild',
		dmOnly: false,
		debug: false,
		run: (interaction) => {
			const msg = {
				interaction,
				builder: null,
			};
			const user = Vars.users.find((u) => u.hash == parseInt(interaction.user.id));
			const exist = Vars.latestMsgs.find(l=>l.user==user);

			if(exist) {
				if(exist.msg.builder && user?.status.name==='selecting' && requireUser && !ignoreSelection) {
					interaction.followUp(`you cannot do this command while selecting!: ${builder.name}`);
					return;
				}
				exist.msg = msg;
			}
			else if(user) Vars.latestMsgs.push({
				user: user,
				msg: msg,
			});

			if (requireUser) { 
				if (user) (callback as (msg: User)=>void)(user);
				else interaction.followUp(Bundle.find((interaction.locale as Assets.bundle.language) || 'en', 'account.account_notLogin')); 
			} else (callback as (msg: Message)=>void)(msg);
		},
		setHiddenConfig: (arg) => arg,
		builder,
	});
}

namespace CommandManager {
  export function init() {
    const users = Vars.users;

    registerCmd(new SlashCommandBuilder().setName('reset').setDescription('remove current selection so that you can do walk'), (user: User) => {
      user.status.clearSelection();
      findMessage(user)?.interaction.followUp('selection is removed successfully!');
    }, true, true);
    registerCmd((() => {
      const s = new SlashCommandBuilder().setName('status').setDescription('show your or someone\'s own status');
      s.addStringOption((option) => {
        option.setName('target').setDescription('target user id');
        if (users.length <= 25) option.addChoices(users.map((u) => [u.id, u.id]));

        return option;
      });
      return s;
    })(), statusCmd, true, true);
    registerCmd((() => {
      const s = new SlashCommandBuilder().setName('inventory').setDescription('show your or someone\'s own inventory');
      s.addStringOption((option) => {
        option.setName('target').setDescription('target user id');
        if (users.length <= 25) option.addChoices(users.map((u) => [u.id, u.id]));

        return option;
      });
      return s;
    })(), inventoryCmd, true, true);
    registerCmd((() => {
      const s = new SlashCommandBuilder().setName('consume').setDescription('consume item');
      s.addStringOption((option) => option.setName('target').setDescription('target item name').setRequired(true).addChoices(Items.getItems().filter((i) => (i as unknown as Consumable).consume).map((u) => [u.localName(), u.localName()])));
      return s;
    })(), consumeCmd, true, true);
    registerCmd((() => {
      const s = new SlashCommandBuilder().setName('swap').setDescription('swap the weapon');
      s.addStringOption((option) => option.setName('target').setDescription('target weapon name').setRequired(true).addChoices(Items.getItems().filter((i) => (i as unknown as Weapon).damage).map((u) => [u.localName(), u.localName()])));
      return s;
    })(), weaponChangeCmd, true, true);
    registerCmd((() => {
      const s = new SlashCommandBuilder().setName('info').setDescription('show content information');
      s.addStringOption((option) => option.setName('type').setDescription('the content type').addChoices([['item', 'item'], ['unit', 'unit']]));
      return s;
    })(), contentInfoCmd, true, true);
    registerCmd(new SlashCommandBuilder().setName('walk').setDescription('just walk around'), walkingCmd, true);
    registerCmd(new SlashCommandBuilder().setName('accounts').setDescription('show all accounts'), (msg: Message) => msg.interaction.followUp(users.map((u) => u.id).join(' | ')));
    registerCmd(new SlashCommandBuilder().setName('signout').setDescription('sign current account out'), (msg: Message) => signout(msg, users), true);
    registerCmd((() => {
      const s = new SlashCommandBuilder().setName('register').setDescription('register new account');
      s.addStringOption((option) => option.setRequired(true).setName('id').setDescription('account id'));
      s.addStringOption((option) => option.setRequired(true).setName('pw').setDescription('account passward'));
      return s;
    })(), (msg: Message) => create(msg, users));
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
    })(), (msg: Message) => signin(msg, users));
    registerCmd((() => {
      const s = new SlashCommandBuilder().setName('change').setDescription('change passward or id');
      s.addStringOption((option) => option.setRequired(true).setName('type').setDescription('id or passward').addChoices([['id', 'id'], ['pw', 'pw']]));
      s.addStringOption((option) => option.setRequired(true).setName('id').setDescription('account id'));
      s.addStringOption((option) => option.setRequired(true).setName('pw').setDescription('account passward'));
      s.addStringOption((option) => option.setRequired(true).setName('target').setDescription('new id/pw'));
      return s;
    })(), (msg: Message) => change(msg, users), true);
  }
}

export default CommandManager;