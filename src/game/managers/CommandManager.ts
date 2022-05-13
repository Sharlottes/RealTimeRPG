import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, MessageEmbed } from 'discord.js';

import { UnitEntity, ItemStack, Items, Units, Vars, BaseEvent, User, findMessage, getOne, save } from '@RTTRPG/game';
import { ExchangeManager, BattleManager, BaseManager, SelectManager } from '@RTTRPG/game/managers';
import { Content, Potion } from '@RTTRPG/game/contents';
import { CommandCategory } from '@RTTRPG/@type';
import { Mathf, Arrays } from '@RTTRPG/util';
import { BaseEmbed } from '@RTTRPG/modules';
import { bundle } from '@RTTRPG/assets';
import CM from '@RTTRPG/commands';

const eventData: BaseEvent[] = [];

function registerEvent(ratio: number, title: string|undefined = undefined, callback: (user: User, interaction: CommandInteraction)=>void) {
	eventData.push(new BaseEvent({
		ratio: ratio,
		title: title
	}, callback));
}

function registerCmd(builder: SlashCommandBuilder, callback: ((user: User, interaction: CommandInteraction)=>void), ignoreSelection = false, category: CommandCategory = 'guild') {
	CM.register({
		category: category,
		dmOnly: false,
		debug: false,
		builder,
		setHiddenConfig: (arg) => arg,
		run: (interaction) => {
			//유저 호출/생성
			const user = Vars.users.find((u) => u.id == interaction.user.id) || Vars.users[Vars.users.push(new User(interaction.user))-1];
			user.user = interaction.user;
			user.locale = interaction.locale;

			if(user.status.name==='selecting' && !ignoreSelection) 
				BaseManager.newErrorEmbed(user, interaction, bundle.format(user.locale, 'error.select', builder.name));
			else {
				//메시지 캐싱
				Vars.messageCache.set(interaction.id, { 
					interaction: interaction, 
					builder: new BaseEmbed(interaction, false).setPages(new MessageEmbed()),
					sender: user
				});

				//명령어 호출
				callback(user, interaction);
			}

			save();
		}
	});
}

namespace CommandManager {
  export function init() {
		eventData.length = 0;
		registerEvent(20, undefined, (user, interaction) => {
			const money = 2 + Math.floor(Math.random() * 10);
			user.money += money;
			interaction.followUp(bundle.format(user.locale, 'event.money', money));
		});

		registerEvent(30, undefined, (user, interaction) => {
			const item = getOne(Items.items.filter((i) => i.dropOnWalk));
			user.giveItem(item);
			interaction.followUp(`${bundle.format(user.locale, 'event.item', item.localName(user))}`);
		});

		registerEvent(1225, 'goblin', (user, interaction) => {
			const { builder } = findMessage(interaction.id);

			new SelectManager(user, interaction, builder)
				.addButtonSelection('battle', 0, (user) => new BattleManager(user, interaction, new UnitEntity(Units.find(1)).setWeapon(new ItemStack(3)), builder))
				.addButtonSelection('run', 0, (user) => {
					if (Mathf.randbool()) {
						const money = Math.floor(Mathf.range(2, 10));
						user.money -= money;
						builder.addFields({name: "Result:", value: "```\n"+bundle.format(user.locale, 'event.goblin_run_failed', money)+"\n```"});
					} else {
						builder.addFields({name: "Result:", value: "```\n"+bundle.find(user.locale, 'event.goblin_run_success')+"\n```"});
					}
					builder.setComponents([]);
					user.status.clearSelection();
				})
				.addButtonSelection('talking', 0, (user) => {
					const money = Math.floor(Mathf.range(2, 5));
					user.money -= money;
					builder.addFields({name: "Result:", value: "```\n"+bundle.format(user.locale, 'event.goblin_talking', money)+"\n```"});
					builder.setComponents([]);
					user.status.clearSelection();
				})
				.addButtonSelection('exchange', 0, (user) => new ExchangeManager(user, interaction, new UnitEntity(Units.find(1)), builder)).start();
		});

		registerEvent(20, 'obstruction', (user, interaction) => {
			const { builder } = findMessage(interaction.id);

			new SelectManager(user, interaction, builder)
				.addButtonSelection('battle', 0, (user) => new BattleManager(user, interaction, new UnitEntity(Units.find(0)).setWeapon(new ItemStack(9)), builder))
				.addButtonSelection('run', 0, (user) => {
					builder.addFields({name: "Result:", value: "```\n"+bundle.find(user.locale, 'event.obstruction_run')+"\n```"});
					builder.setComponents([]);
					user.status.clearSelection();
				}).start();
		});

    registerCmd(new SlashCommandBuilder().setName('status').setDescription('show your own status'), (user, interaction) => user.getUserInfo(interaction), true);
    registerCmd(new SlashCommandBuilder().setName('inventory').setDescription('show your own inventory'), (user, interaction) => user.getInventoryInfo(interaction), true);

    registerCmd((() => {
      const s = new SlashCommandBuilder().setName('consume').setDescription('consume item');
      s.addIntegerOption((option) => option.setName('target').setDescription('item name').setRequired(true).addChoices(Items.items.reduce<[name: string, value: number][]>((a, i) => i instanceof Potion ? [...a, [i.name, i.id]] : a, [])));
			s.addIntegerOption((option) => option.setName('amount').setDescription('item amount'));
			return s;
    })(), (user, interaction) => {
			const id = interaction.options.getInteger('target', true);
			const amount = interaction.options.getInteger('amount', false)||1;
			const stack: ItemStack | undefined = user.inventory.items.find((i) => i.id == id);
			if (!stack) BaseManager.newErrorEmbed(user, interaction, bundle.format(user.locale, 'error.notFound', Items.find(id).localName(user)));
			else if (stack.amount <= 0) BaseManager.newErrorEmbed(user, interaction, bundle.format(user.locale, 'error.missing_item', stack.getItem().localName(user)));
			else if (stack.amount < amount) BaseManager.newErrorEmbed(user, interaction, bundle.format(user.locale, 'error.not_enough', stack.getItem().localName(user), amount));
			else BaseManager.newTextEmbed(user, interaction, stack.consume(user, amount));
		}, true);

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
		}, true);

    registerCmd(new SlashCommandBuilder().setName('walk').setDescription('just walk around'), (user, interaction) => {
			if (user.stats.energy >= 7) {
				user.stats.energy -= 7;
				getOne(eventData.map(e=>e.data), (data,i)=> eventData[i].start(user, interaction));
			} else {
				BaseManager.newErrorEmbed(user, interaction, bundle.format(user.locale, 'error.low_energy', user.stats.energy.toFixed(1)));
			}
		});

    registerCmd(new SlashCommandBuilder().setName('intro').setDescription('introduce bot info(WIP)'), (user, interaction) => {
			new BaseManager(user, interaction, new BaseEmbed(interaction).setPages(new MessageEmbed()).setTitle('Real Time Text RPG').setDescription(bundle.find(user.locale, 'bot.description'), '', false).setFields({
				name: 'GOAL', value: bundle.find(user.locale, 'bot.goal') 
			})).start();
		}, true);
  }
}

export default CommandManager;