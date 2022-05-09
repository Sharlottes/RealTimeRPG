import { SlashCommandBuilder } from '@discordjs/builders';
import Discord, { CacheType, MessageEmbed } from 'discord.js';

import { PagesBuilder } from 'discord.js-pages';
import { User } from '../modules';
import { Mathf } from '../util';
import { UnitEntity, Items, Units, Vars } from '.';
import { ItemStack, Weapon } from './contents';
import { Consumable } from '@뇌절봇/@type';
import { bundle } from '../assets';
import { BaseEvent, EventSelection, SelectEvent } from '../event';

import CM from '../commands';
import ExchangeManager from './ExchangeManager';
import { findMessage, getOne, save } from './rpg_';
import { BaseEmbed } from '../modules/BaseEmbed';
import BattleManager from './BattleManager';

const eventData: BaseEvent[] = [
	new BaseEvent({
		ratio: 20
	}, (user) => {
		const msg = findMessage(user);
		
		const money = 2 + Math.floor(Math.random() * 10);
		user.money += money;
		msg.interaction.followUp(bundle.format(user.getLocale(msg), 'event.money', money));
	}),

	new BaseEvent({
		ratio: 30
	}, (user) => {
		const msg = findMessage(user);
		const item = getOne(Items.items.filter((i) => i.dropOnWalk));
		user.giveItem(item);
		msg.interaction.followUp(`${bundle.format(user.getLocale(msg), 'event.item', item.localName(user))}`);
	}),
	new SelectEvent({
		ratio: 15,
		title: 'goblin'
	},
		[[
			new EventSelection('run', (user) => {
				const msg = findMessage(user);
				if(!msg.builder) return;
				if (Mathf.randbool()) {
					const money = Math.floor(Mathf.range(2, 10));
					user.money -= money;
					msg.builder.addFields([{name: "Result:", value: "```\n"+bundle.format(user.getLocale(msg), 'event.goblin_run_failed', money)+"\n```"}]);
				} else {
					msg.builder.addFields([{name: "Result:", value: "```\n"+bundle.find(user.getLocale(msg), 'event.goblin_run_success')+"\n```"}]);
				}
				msg.builder.setComponents([]);
				user.status.clearSelection();
			}),
			new EventSelection('talking', (user) => {
				const msg = findMessage(user);
				if(!msg.builder) return;

				const money = Math.floor(Mathf.range(2, 5));
				user.money -= money;
				msg.builder.addFields([{name: "Result:", value: (bundle.format(user.getLocale(msg), 'event.goblin_talking', money))}]);
				msg.builder.setComponents([]);
				user.status.clearSelection();
			}),
			new EventSelection('exchange', (user) => new ExchangeManager(user, new UnitEntity(Units.find(1))))
		]]
	),
	new SelectEvent({
		ratio: 20,
		title: 'obstruction',
	},[[
			new EventSelection('battle', (user) => new BattleManager(user, new UnitEntity(Units.find(0)))),
			new EventSelection('run', async (user) => {
				const msg = findMessage(user);
				if(!msg || !msg.builder) return;
				
				user.status.clearSelection();
				msg.builder.setComponents([]);
				msg.builder = null;
				msg.interaction.followUp(bundle.find(user.getLocale(msg), 'event.obstruction_run'));
			})
		]]
	),
];

function consumeCmd(user: User) {
	const msg = findMessage(user);
	const name = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('target', true);
	const stack: ItemStack | undefined = user.inventory.items.find((i) => i.getItem().name == name);
	if (!stack || stack.amount <= 0) return new BaseEmbed(msg.interaction).addField('ERROR', bundle.format(user.getLocale(msg), 'notFound', name));

	const result = stack.consume(user);
	if (result) msg.interaction.followUp(result);
}

function weaponChangeCmd(user: User) {
	const msg = findMessage(user);
	const weapon = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('target', true);

	return user.switchWeapon(Items.find<Weapon>((i) => i.localName(user) == weapon));
}

function walkingCmd(user: User) {
	const msg = findMessage(user);
	
	if (user.stats.energy >= 7) {
		user.countover = 0;
		user.stats.energy -= 7;
		getOne(eventData.map(e=>e.data), (data,i)=>{
			eventData[i].start(user);
			return 'walking...';
		});
	} else {
		if (user.countover >= 3) {
			return bundle.find(user.getLocale(msg), 'calmdown');
		} else {
			user.countover++;
			return bundle.format(user.getLocale(msg), 'notEnergy', user.stats.energy.toFixed(1));
		}
	}
}

function contentInfoCmd(user: User) {
	const msg = findMessage(user);
	const type = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('type', false);
	const embeds = [];

	if(!type || type == 'unit') {
		const unitEmbed = new MessageEmbed();
		for(const unit of Units.units) {
			if(!user.foundContents.units.includes(unit.id)) continue;
			unitEmbed.addField(unit.localName(user), unit.description(user)+'\n\n'+(unit.details(user)||''));
		}
		embeds.push(unitEmbed);
	}

	if(!type || type == 'item') {
		const itemEmbed = new MessageEmbed();
		for(const item of Items.items) {
			if(!user.foundContents.items.includes(item.id)) continue;
			itemEmbed.addField(item.localName(user), item.description(user)+'\n\n'+(item.details(user)||''));
		}
		embeds.push(itemEmbed);
	}

	return new BaseEmbed(msg.interaction).setPages(embeds).setDefaultButtons(['back', 'next']);
}

function registerCmd(builder: SlashCommandBuilder, callback: ((user: User)=>PagesBuilder|string|undefined), ignoreSelection = false) {
	CM.register({
		category: 'guild',
		dmOnly: false,
		debug: false,
		builder,
		setHiddenConfig: (arg) => arg,
		run: (interaction) => {
			const user = Vars.users.find((u) => u.id == interaction.user.id) || Vars.users[Vars.users.push(new User(interaction.user))-1];
			user.user = interaction.user;
			const msg = Vars.latestMsg.get(user) || { interaction };
			msg.interaction = interaction;
			Vars.latestMsg.set(user, msg);

			//update latestMsgs
			if(user.status.name==='selecting' && !ignoreSelection) {
				new BaseEmbed(interaction).setTitle('ERROR').setDescription(bundle.format('error.select', builder.name)).build();
				return;
			}

			//call command listener
			const embed = (callback as (msg: User)=>PagesBuilder)(user);

			if(embed) {
				if(embed instanceof PagesBuilder) embed.build();
				else if(typeof embed === 'string') new BaseEmbed(interaction).setDescription(embed).build();
				else new BaseEmbed(interaction).setTitle('ERROR').setDescription('something got crashed!').build();
			}

			save();
		}
	});
}

namespace CommandManager {
  export function init() {
    registerCmd(new SlashCommandBuilder().setName('reset').setDescription('remove current selection so that you can do walk'), (user: User) => {
      user.status.clearSelection();
      return 'selection is removed successfully!';
    }, true);
    registerCmd(new SlashCommandBuilder().setName('status').setDescription('show your own status'), (user: User) => user.getUserInfo(findMessage(user)), true);
    registerCmd(new SlashCommandBuilder().setName('inventory').setDescription('show your own inventory'), (user: User) => user.getInventoryInfo(findMessage(user)), true);
    registerCmd((() => {
      const s = new SlashCommandBuilder().setName('consume').setDescription('consume item');
      s.addStringOption((option) => option.setName('target').setDescription('target item name').setRequired(true).addChoices(Items.items.filter((i) => (i as unknown as Consumable).consume).map((u) => [u.name, u.name])));
      return s;
    })(), consumeCmd, true);
    registerCmd((() => {
      const s = new SlashCommandBuilder().setName('swap').setDescription('swap the weapon');
      s.addStringOption((option) => option.setName('target').setDescription('target weapon name').setRequired(true).addChoices(Items.items.filter((i) => (i as unknown as Weapon).damage).map((u) => [u.name, u.name])));
      return s;
    })(), weaponChangeCmd, true); 
    registerCmd((() => {
      const s = new SlashCommandBuilder().setName('info').setDescription('show content information');
      s.addStringOption((option) => option.setName('type').setDescription('the content type').addChoices([['item', 'item'], ['unit', 'unit']]));
      return s;
    })(), contentInfoCmd, true);
    registerCmd(new SlashCommandBuilder().setName('walk').setDescription('just walk around'), walkingCmd);
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