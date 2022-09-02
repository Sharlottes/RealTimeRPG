import { CommandInteraction, MessageEmbed } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import Random from 'random';

import { UnitEntity, ItemStack, BaseEvent, User, getOne } from '@RTTRPG/game';
import EncounterManager from '@RTTRPG/game/managers/EncounterManager';
import { Items, Units, Content } from '@RTTRPG/game/contents';
import { CommandCategory } from '@RTTRPG/@type';
import { bundle } from '@RTTRPG/assets';
import { Arrays } from '@RTTRPG/util';
import CM from '@RTTRPG/commands';
import Vars from '@RTTRPG/Vars';
import Manager from '../game/managers/Manager';

const eventData: BaseEvent[] = [];

function registerEvent(ratio: number, callback: (user: User, interaction: CommandInteraction) => void) {
	eventData.push(new BaseEvent(ratio, callback));
}

function registerCmd(builder: SlashCommandBuilder, callback: ((user: User, interaction: CommandInteraction) => void), category: CommandCategory = 'guild') {
	CM.register({
		category: category,
		dmOnly: false,
		debug: false,
		builder,
		setHiddenConfig: (arg) => arg,
		run: (interaction) => {
			//유저 호출/생성
			const user = Vars.users.find((u) => u.id == interaction.user.id) || Vars.users[Vars.users.push(new User(interaction.user)) - 1];
			user.updateData(interaction);

			//메시지 캐싱
			Vars.messageCache.set(interaction.id, {
				interaction: interaction,
				sender: user
			});

			//명령어 호출
			callback(user, interaction);
		}
	});
}

namespace CommandManager {
	export function init() {
		eventData.length = 0;
		registerEvent(15, (user, interaction) => {
			const money = 2 + Math.floor(Math.random() * 10);
			user.money += money;
			interaction.followUp(bundle.format(user.locale, 'event.money', money));
		});

		registerEvent(10, (user, interaction) => {
			const item = getOne(Items.items.filter((i) => i.dropOnWalk));
			user.giveItem(item);
			interaction.followUp(`${bundle.format(user.locale, 'event.item', item.localName(user))}`);
		});

		registerEvent(15, (user, interaction) => {
			EncounterManager.start<typeof EncounterManager>({
				user: user,
				interaction: interaction, 
				target: new UnitEntity(Units.find(Random.int(0, Units.units.length - 1)))
			});
		});

		registerCmd(
			new SlashCommandBuilder()
				.addUserOption((option) => option.setName('target').setDescription('target user'))
				.setName('status')
				.setDescription('show your own status'),
			(user, interaction) => {
				const target = interaction.options.getUser('target', false);
				if (target) {
					const found = Vars.users.find(user => user.id == target.id);
					if (found) {
						found.user ??= target;
						found.showUserInfo(interaction);
					} else {
						Manager.newErrorEmbed(interaction, bundle.format(interaction.locale, 'error.notFound', target.username));
					}
				}
				else user.showUserInfo(interaction);
			}
		);
		registerCmd(
			new SlashCommandBuilder()
				.addUserOption((option) => option.setName('target').setDescription('target user'))
				.setName('inventory')
				.setDescription('show your own inventory'),
			(user, interaction) => {
				const target = interaction.options.getUser('target', false);
				if (target) {
					const found = Vars.users.find(user => user.user.id == target.id);
					if (found) found.showInventoryInfo(interaction);
					else Manager.newErrorEmbed(interaction, bundle.format(interaction.locale, 'error.notFound', target.username));
				}
				else user.showInventoryInfo(interaction);
			}
		);

		registerCmd(
			new SlashCommandBuilder()
				.addIntegerOption((option) => option.setName('target').setDescription('item name').setRequired(true).addChoices(Items.items.reduce<[name: string, value: number][]>((a, i) => i.hasConsume() ? [...a, [i.name, i.id]] : a, [])))
				.addIntegerOption((option) => option.setName('amount').setDescription('item amount'))
				.setName('consume')
				.setDescription('consume item'),
			(user, interaction) => {
				const id = interaction.options.getInteger('target', true);
				const amount = interaction.options.getInteger('amount', false) ?? 1;
				const stack = user.inventory.items.find((i) => i.item.id == id);

				if (!stack) {
					Manager.newErrorEmbed(interaction, bundle.format(user.locale, 'error.missing_item', Items.find(id).localName(user)));
				} else if ((stack instanceof ItemStack ? stack.amount : 1) < amount) {
					Manager.newErrorEmbed(interaction, bundle.format(user.locale, 'error.not_enough', stack.item.localName(user), amount));
				} else {
					const potion = stack.item;
					const cons = potion.getConsume();

					user.inventory.remove(potion, amount);
					cons.consume(user, amount);
					Manager.newTextEmbed(interaction, bundle.format(user.locale, 'consume', potion.localName(user), amount, cons.buffes.map((b) => b.description(user, amount, b, user.locale)).join('\n  ')));
				}
			}
		);

		registerCmd(
			new SlashCommandBuilder()
				.addStringOption((option) => option.setName('type').setDescription('the content type').addChoices([['item', 'item'], ['unit', 'unit']]))
				.setName('info')
				.setDescription('show content information'),
			(user, interaction) => {
				const type = interaction.options.getString('type', false);
				const contents: Content[] = [];
				const embeds: MessageEmbed[] = [];

				if (!type || type == 'unit') {
					for (const unit of Units.units) {
						if (!user.foundContents.units.includes(unit.id)) continue;
						contents.push(unit);
					}
				}

				if (!type || type == 'item') {
					for (const item of Items.items) {
						if (!user.foundContents.items.includes(item.id)) continue;
						contents.push(item);
					}
				}

				Arrays.division(contents, 5).forEach(conts => {
					const embed = new MessageEmbed();
					conts.forEach(cont => embed.addField(cont.localName(user), cont.description(user) + '\n\n' + (cont.details(user) || '')));
					embeds.push(embed);
				});
				if (embeds.length <= 0) embeds.push(new MessageEmbed().setDescription('< empty >'));
				//TODO: make page
				Manager.start({
					interaction: interaction, 
					embeds: [new MessageEmbed()]
				});
			}
		);

		registerCmd(new SlashCommandBuilder().setName('walk').setDescription('just walk around'), (user, interaction) => {
			getOne(eventData).start(user, interaction);
			/*
			if (user.stats.energy >= 7) {
				user.stats.energy -= 7;
				getOne(eventData).start(user, interaction);
			} else {
				Manager.newErrorEmbed(user, interaction, bundle.format(user.locale, 'error.low_energy', user.stats.energy.toFixed(1), 7));
			}
			*/
		});

		registerCmd(
			new SlashCommandBuilder()
				.setName('intro')
				.setDescription('introduce bot info(WIP)'),
			(user, interaction) => {
				interaction.editReply({
					embeds: [
						new MessageEmbed()
							.setTitle('Real Time Text RPG')
							.setDescription(bundle.find(user.locale, 'bot.description'))
							.addField('GOAL', bundle.find(user.locale, 'bot.goal'))
					]
				});
			}
		);
	}
}

export default CommandManager;