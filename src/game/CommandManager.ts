import { SlashCommandBuilder } from '@discordjs/builders';
import Discord, { CacheType, MessageEmbed } from 'discord.js';

import { PagesBuilder } from 'discord.js-pages';
import { User } from '../modules';
import { Utils } from '../util';
import { UnitEntity, Items, Units, Vars } from '.';
import { Unit, Item, ItemStack, Weapon } from './contents';
import { Consumable, Message } from '@뇌절봇/@type';
import Assets from '../assets';
import { BaseEvent, EventSelection, SelectEvent } from '../event';

import CM from '../commands';
import { battle } from './BattleManager';
import { exchange } from './ExchangeManager';
import { findMessage, getOne, save } from './rpg_';
import { BaseEmbed } from '../modules/BaseEmbed';
import app from '..';

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
		msg.interaction.followUp(Bundle.format(user.getLocale(msg), 'event.money', money));
	}),

	new BaseEvent({
		ratio: 30
	}, (user) => {
		const msg = findMessage(user);
		if(!msg) return;
		const item = getOne(Items.items.filter((i) => i.dropOnWalk));
		msg.interaction.followUp(`${Bundle.format(user.getLocale(msg), 'event.item', item.localName(user))}\n${user.giveItem(item) || ''}`);
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
					msg.builder?.addFields([{name: "Result:", value: "```\n"+Bundle.format(user.getLocale(msg), 'event.goblin_run_failed', money)+"\n```"}]);
				} else {
					msg.builder?.addFields([{name: "Result:", value: "```\n"+Bundle.find(user.getLocale(msg), 'event.goblin_run_success')+"\n```"}]);
				}
				user.selectBuilder?.setComponents([]);
				user.status.clearSelection();
			}),
			new EventSelection('talking', (user) => {
				const msg = findMessage(user);
				if(!msg) return;

				const money = Math.floor(Mathf.range(2, 5));
				user.money -= money;
				msg.builder?.addFields([{name: "Result:", value: (Bundle.format(user.getLocale(msg), 'event.goblin_talking', money))}]);
				msg.builder?.setComponents([]);
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
				msg.interaction.followUp(Bundle.find(user.getLocale(msg), 'event.obstruction_run'));
			})
		]]
	),
];

function statusCmd(user: User) {
	const msg = findMessage(user);
	if(!msg) return;
	
	return user.getUserInfo(msg);
}

function inventoryCmd(user: User) {
	const msg = findMessage(user);
	if(!msg) return;

	return user.getInventoryInfo(msg);
}

function consumeCmd(user: User) {
	const msg = findMessage(user);
	if(!msg) return;
	
	const name = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('target', true);
	const stack: ItemStack | undefined = user.inventory.items.find((i) => ItemStack.getItem(i).localName(user) == name);
	if (!stack) return new BaseEmbed(msg.interaction).addField('ERROR', Bundle.format(user.getLocale(msg), 'account.notFound', name));
	const result = ItemStack.consume(stack, user);
	if (result) msg.interaction.followUp(result);
	save();
}

function weaponChangeCmd(user: User) {
	const msg = findMessage(user);
	if(!msg) return;

	const weapon = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('target', true);
	return user.switchWeapon(Items.find<Weapon>((i) => i.localName(user) == weapon));
}

function walkingCmd(user: User) {
	const msg = findMessage(user);
	if(!msg) return;

	if (user.stats.energy >= 7) {
		user.countover = 0;
		user.stats.energy -= 7;
		getOne(eventData.map(e=>e.data), (data,i)=>{
			eventData[i].start(user);
			return 'walking...';
		});
	} else {
		if (user.countover >= 3) {
			return Bundle.find(user.getLocale(msg), 'calmdown');
		} else {
			user.countover++;
			return Bundle.format(user.getLocale(msg), 'notEnergy', user.stats.energy.toFixed(1));
		}
	}
}

function info(user: User, content: Item|Unit) {
	const msg = findMessage(user);
	if(!msg) return;

	return (
		`${user.foundContents[content instanceof Item ? 'items' : 'units'].includes(content.id)
			? content.localName(user) : 'unknown'
		}\n${
			user.foundContents[content instanceof Item ? 'items' : 'units'].includes(content.id)
				? content.description(user) : 'unknown'
		}${content.details(user)
			? `\n------------\n  ${user.foundContents[content instanceof Item ? 'items' : 'units'].includes(content.id)
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

	if (showAll || type === 'unit') infoes = infoes.concat(Units.units.map((cont) => `\`\`\`${info(user, cont)}\`\`\``));
	if (showAll || type === 'item') infoes = infoes.concat(Items.items.map((cont) => `\`\`\`${info(user, cont)}\`\`\``));

	for (let i = 0; i < Math.floor(infoes.length / 4); i++) { 
		out.push(infoes.slice(i * 4, Math.min(infoes.length, (i + 1) * 4))); 
	}

	return new BaseEmbed(msg.interaction).setPages(out.map((infoes) => new MessageEmbed().setDescription(infoes.join('')))).setDefaultButtons(['back', 'next']);
}

function registerCmd(builder: SlashCommandBuilder, callback: (user: User) => PagesBuilder|string|undefined, requireUser?: boolean, ignoreSelection?: boolean): void;
function registerCmd(builder: SlashCommandBuilder, callback: (msg: Message) => PagesBuilder|string|undefined, requireUser?: boolean, ignoreSelection?: boolean): void;
function registerCmd(builder: SlashCommandBuilder, callback: ((user: User)=>PagesBuilder|string|undefined)|((msg: Message)=>PagesBuilder|string|undefined), requireUser = false, ignoreSelection = false) {
	CM.register({
		category: 'guild',
		dmOnly: false,
		debug: false,
		run: (interaction) => {
			const msg = {
				interaction,
				builder: null,
			};
			const user = Vars.users.find((u) => u.user.id == interaction.user.id) || new User(interaction.user);
			const exist = Vars.latestMsgs.find(l=>l.user == user);

			//update latestMsgs
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

			//call command listener
			let embed;
			if (requireUser) embed = (callback as (msg: User)=>PagesBuilder)(user);
			else embed = (callback as (msg: Message)=>PagesBuilder)(msg);

			if(embed) {
				if(embed instanceof PagesBuilder) embed.build();
				else if(typeof embed === 'string') new BaseEmbed(msg.interaction).setDescription(embed).build();
				else new BaseEmbed(msg.interaction).setTitle('ERROR').setDescription('something got crashed!').build();
			}
		},
		setHiddenConfig: (arg) => arg,
		builder,
	});
}

namespace CommandManager {
  export function init() {
    registerCmd(new SlashCommandBuilder().setName('reset').setDescription('remove current selection so that you can do walk'), (user: User) => {
      user.status.clearSelection();
      return 'selection is removed successfully!';
    }, true, true);
    registerCmd(new SlashCommandBuilder().setName('status').setDescription('show your or someone\'s own status'), statusCmd, true, true);
    registerCmd(new SlashCommandBuilder().setName('inventory').setDescription('show your or someone\'s own inventory'), inventoryCmd, true, true);
    registerCmd((() => {
      const s = new SlashCommandBuilder().setName('consume').setDescription('consume item');
      s.addStringOption((option) => option.setName('target').setDescription('target item name').setRequired(true).addChoices(Items.items.filter((i) => (i as unknown as Consumable).consume).map((u) => [u.localName(), u.localName()])));
      return s;
    })(), consumeCmd, true, true);
    registerCmd((() => {
      const s = new SlashCommandBuilder().setName('swap').setDescription('swap the weapon');
      s.addStringOption((option) => option.setName('target').setDescription('target weapon name').setRequired(true).addChoices(Items.items.filter((i) => (i as unknown as Weapon).damage).map((u) => [u.localName(), u.localName()])));
      return s;
    })(), weaponChangeCmd, true, true);
    registerCmd((() => {
      const s = new SlashCommandBuilder().setName('info').setDescription('show content information');
      s.addStringOption((option) => option.setName('type').setDescription('the content type').addChoices([['item', 'item'], ['unit', 'unit']]));
      return s;
    })(), contentInfoCmd, true, true);
    registerCmd(new SlashCommandBuilder().setName('walk').setDescription('just walk around'), walkingCmd, true);
		/*
    registerCmd(new SlashCommandBuilder().setName('accounts').setDescription('show all accounts'), (msg: Message) => users.map((u) => u.id).join(' | '));
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
		*/
  }
}

export default CommandManager;