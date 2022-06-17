import { CommandInteraction, MessageEmbed } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import Random from 'random';

import { UnitEntity, ItemStack, BaseEvent, User, findMessage, getOne, save } from '@RTTRPG/game';
import { BaseManager, EncounterManager } from '@RTTRPG/game/managers';
import { Items, Units, Content, Potion } from '@RTTRPG/game/contents';
import { CommandCategory } from '@RTTRPG/@type';
import { BaseEmbed } from '@RTTRPG/modules';
import { bundle } from '@RTTRPG/assets';
import { Arrays } from '@RTTRPG/util';
import CM from '@RTTRPG/commands';
import Vars from '@RTTRPG/Vars';

const eventData: BaseEvent[] = [];

function registerEvent(ratio: number, callback: (user: User, interaction: CommandInteraction)=>void) {
	eventData.push(new BaseEvent(ratio, callback));
}

function registerCmd(builder: SlashCommandBuilder, callback: ((user: User, interaction: CommandInteraction)=>void), category: CommandCategory = 'guild') {
	CM.register({
		category: category,
		dmOnly: false,
		debug: false,
		builder,
		setHiddenConfig: (arg) => arg,
		run: (interaction) => {
			//유저 호출/생성
			const user = Vars.users.find((u) => u.id == interaction.user.id) || Vars.users[Vars.users.push(new User(interaction.user))-1];
			user.user ??= interaction.user;
      user.name ??= user.user?.username;
			user.locale = interaction.locale;

			//메시지 캐싱
			Vars.messageCache.set(interaction.id, { 
				interaction: interaction, 
				builder: new BaseEmbed(interaction, false).setPages(new MessageEmbed()),
				sender: user
			});

			//명령어 호출
			callback(user, interaction);
			save();
		}
	});
}

namespace CommandManager {
  export function init() {
		eventData.length = 0;
		registerEvent(20, (user, interaction) => {
			const money = 2 + Math.floor(Math.random() * 10);
			user.money += money;
			interaction.followUp(bundle.format(user.locale, 'event.money', money));
		});

		registerEvent(30, (user, interaction) => {
			const item = getOne(Items.items.filter((i) => i.dropOnWalk));
			user.giveItem(item);
			interaction.followUp(`${bundle.format(user.locale, 'event.item', item.localName(user))}`);
		});

		registerEvent(15, (user, interaction) => {
			const { builder } = findMessage(interaction.id);
			new EncounterManager(user, interaction, new UnitEntity(Units.find(Random.int(0,1))), builder).start();
		});

    registerCmd(new SlashCommandBuilder().setName('status').setDescription('show your own status'), (user, interaction) => user.getUserInfo(interaction).build());
    registerCmd(new SlashCommandBuilder().setName('inventory').setDescription('show your own inventory'), (user, interaction) => user.getInventoryInfo(interaction).build());

    registerCmd((() => {
      const s = new SlashCommandBuilder().setName('consume').setDescription('consume item');
      s.addIntegerOption((option) => option.setName('target').setDescription('item name').setRequired(true).addChoices(Items.items.reduce<[name: string, value: number][]>((a, i) => i instanceof Potion ? [...a, [i.name, i.id]] : a, [])));
			s.addIntegerOption((option) => option.setName('amount').setDescription('item amount'));
			return s;
    })(), (user, interaction) => {
			const id = interaction.options.getInteger('target', true);
			const amount = interaction.options.getInteger('amount', false)??1;
			const stack = user.inventory.items.find((i) => i.item.id == id);
			if (!stack) BaseManager.newErrorEmbed(user, interaction, bundle.format(user.locale, 'error.missing_item', Items.find(id).localName(user)));
			else if ((stack instanceof ItemStack ? stack.amount : 1) < amount) BaseManager.newErrorEmbed(user, interaction, bundle.format(user.locale, 'error.not_enough', stack.item.localName(user), amount));
			else {
				const potion = stack.item as Potion;
				user.inventory.remove(potion, amount);
				potion.consume(user, amount);
				BaseManager.newTextEmbed(user, interaction, bundle.format(user.locale, 'consume', potion.localName(user), amount, potion.buffes.map((b) => b.description(user, amount, b, user.locale)).join('\n  ')));
			}
		});

    registerCmd((() => {
      const s = new SlashCommandBuilder().setName('info').setDescription('show content information');
      s.addStringOption((option) => option.setName('type').setDescription('the content type').addChoices([['item', 'item'], ['unit', 'unit']]));
      return s;
    })(), (user, interaction) => {
			const type = interaction.options.getString('type', false);
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
			if(embeds.length <= 0) embeds.push(new MessageEmbed().setDescription('< empty >'));
			new BaseManager(user, interaction, new BaseEmbed(interaction).setPages(embeds).setDefaultButtons(['back', 'next'])).start();
		});

    registerCmd(new SlashCommandBuilder().setName('walk').setDescription('just walk around'), (user, interaction) => {
			getOne(eventData).start(user, interaction);
			/*
			if (user.stats.energy >= 7) {
				user.stats.energy -= 7;
				getOne(eventData).start(user, interaction);
			} else {
				BaseManager.newErrorEmbed(user, interaction, bundle.format(user.locale, 'error.low_energy', user.stats.energy.toFixed(1), 7));
			}
			*/
		});

    registerCmd(new SlashCommandBuilder().setName('intro').setDescription('introduce bot info(WIP)'), (user, interaction) => {
			new BaseManager(user, interaction, new BaseEmbed(interaction).setPages(new MessageEmbed()).setTitle('Real Time Text RPG').setDescription(bundle.find(user.locale, 'bot.description'), '', false).setFields({
				name: 'GOAL', value: bundle.find(user.locale, 'bot.goal') 
			})).start();
		});
  }
}

export default CommandManager;