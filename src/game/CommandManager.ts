import { SlashCommandBuilder } from '@discordjs/builders';
import Discord, { CacheType, MessageEmbed } from 'discord.js';
import { PagesBuilder } from 'discord.js-pages';

import { BaseEvent, EventSelection, SelectEvent } from '../event';
import { User, BaseEmbed } from '../modules';
import { Mathf, Arrays } from '../util';
import { Consumable } from '../@type';
import { bundle } from '../assets';
import CM from '../commands';

import { Content, Weapon } from './contents';
import { UnitEntity, Items, Units, Vars, findMessage, getOne, save, ExchangeManager, BattleManager, ItemStack } from '.';

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
					msg.builder.addFields({name: "Result:", value: "```\n"+bundle.format(user.getLocale(msg), 'event.goblin_run_failed', money)+"\n```"});
				} else {
					msg.builder.addFields({name: "Result:", value: "```\n"+bundle.find(user.getLocale(msg), 'event.goblin_run_success')+"\n```"});
				}
				msg.builder.setComponents([]);
				user.status.clearSelection();
			}),
			new EventSelection('talking', (user) => {
				const msg = findMessage(user);
				if(!msg.builder) return;

				const money = Math.floor(Mathf.range(2, 5));
				user.money -= money;
				msg.builder.addFields({name: "Result:", value: "```\n"+bundle.format(user.getLocale(msg), 'event.goblin_talking', money)+"\n```"});
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
	const id = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getInteger('target', true);
	const amount = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getInteger('amount', false)||1;
	const stack: ItemStack | undefined = user.inventory.items.find((i) => i.getItem().id == id);
	if (!stack) return new BaseEmbed(msg.interaction).setTitle("ERROR").setDescription(bundle.format(user.getLocale(msg), 'error.notFound', Items.find(id).localName(user)));
	if (stack.amount <= 0) return new BaseEmbed(msg.interaction).setTitle("ERROR").setDescription(bundle.format(user.getLocale(msg), 'error.missing_item', stack.getItem().localName(user)));
	if (stack.amount <= amount) return new BaseEmbed(msg.interaction).setTitle("ERROR").setDescription(bundle.format(user.getLocale(msg), 'error.not_enough', stack.getItem().localName(user), amount));
	return new BaseEmbed(msg.interaction).setDescription(stack.consume(user, amount));
}

function walkingCmd(user: User) {
	const msg = findMessage(user);
	
	if (user.stats.energy >= 7) {
		user.countover = 0;
		user.stats.energy -= 7;
		getOne(eventData.map(e=>e.data), (data,i)=> eventData[i].start(user));
	} else {
		if (user.countover >= 3) {
			return new BaseEmbed(msg.interaction).setTitle("ERROR").setDescription(bundle.format(user.getLocale(msg), 'error.calmdown'));
		} else {
			user.countover++;
			return new BaseEmbed(msg.interaction).setTitle("ERROR").setDescription(bundle.format(user.getLocale(msg), 'error.low_energy', user.stats.energy.toFixed(1)));
		}
	}
}

function contentInfoCmd(user: User) {
	const msg = findMessage(user);
	const type = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('type', false);
	const contents: Content[] = [];
	const embeds: MessageEmbed[] = [];

	if(!type || type == 'unit') {
		for(const unit of Units.units) {
			if(!user.foundContents.units.includes(unit.id)) continue;
			contents.push(unit);
		}
	}

	if(!type || type == 'item') {
		for(const item of Items.items) {
			if(!user.foundContents.items.includes(item.id)) continue;
			contents.push(item);
		}
	}

	Arrays.division(contents, 5).forEach(conts=>{
		const embed = new MessageEmbed();
		conts.forEach(cont=>embed.addField(cont.localName(user), cont.description(user)+'\n\n'+(cont.details(user)||'')));
		embeds.push(embed);
	});

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

			//update latestMsgs
			Vars.latestMsg.set(user, msg);

			//call command listener
			if(user.status.name==='selecting' && !ignoreSelection) {
				new BaseEmbed(interaction).setTitle('ERROR').setDescription(bundle.format('error.select', builder.name)).build();
			}
			else {
				const embed = (callback as (msg: User)=>PagesBuilder)(user);
				if(embed instanceof PagesBuilder) embed.build();
				else if(typeof embed === 'string') new BaseEmbed(interaction).setDescription(embed).build();
				else if(embed) new BaseEmbed(interaction).setTitle('ERROR').setDescription('something got crashed!').build();
			}

			save();
		}
	});
}

namespace CommandManager {
  export function init() {
    registerCmd(new SlashCommandBuilder().setName('status').setDescription('show your own status'), (user: User) => user.getUserInfo(findMessage(user)), true);
    registerCmd(new SlashCommandBuilder().setName('inventory').setDescription('show your own inventory'), (user: User) => user.getInventoryInfo(findMessage(user)), true);
    registerCmd((() => {
      const s = new SlashCommandBuilder().setName('consume').setDescription('consume item');
      s.addIntegerOption((option) => option.setName('target').setDescription('item name').setRequired(true).addChoices(Items.items.filter((i) => (i as unknown as Consumable).consume).map((u) => [u.name, u.id])));
			s.addIntegerOption((option) => option.setName('amount').setDescription('item amount'));
			return s;
    })(), consumeCmd, true);
    registerCmd((() => {
      const s = new SlashCommandBuilder().setName('info').setDescription('show content information');
      s.addStringOption((option) => option.setName('type').setDescription('the content type').addChoices([['item', 'item'], ['unit', 'unit']]));
      return s;
    })(), contentInfoCmd, true);
    registerCmd(new SlashCommandBuilder().setName('walk').setDescription('just walk around'), walkingCmd);
  }
}

export default CommandManager;