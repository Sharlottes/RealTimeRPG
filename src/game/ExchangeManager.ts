import Discord, { MessageActionRow, MessageActionRowComponent, MessageActionRowComponentResolvable, MessageButton, MessageButtonOptions, MessageSelectMenu } from 'discord.js';

import { ITrigger } from 'discord.js-pages';
import { User } from '../modules';
import { UnitEntity, Items } from '.';
import { ItemStack } from './contents';
import { Durable } from '@뇌절봇/@type';
import Assets from '../assets';
import { EventSelection, SelectEvent } from '../event';

import { findMessage, getOne, giveItem, save } from './rpg_';

const Bundle = Assets.bundle;

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
						if (amount > ent.amount) { 
							msg.builder?.setDescription(`${msg.builder.description}\`\`\`diff\n- ${Bundle.format(user.lang, 'shop.notEnough_item', item.localName(user), amount, ent.amount)}\`\`\``); 
						} 
						else if (user.money < amount * money) { 
							msg.builder?.setDescription(`${msg.builder.description}\`\`\`diff\n- ${Bundle.format(user.lang, 'shop.notEnough_money', amount * money, user.money)}\`\`\``); 
						} 
						else {
							msg.builder?.setDescription(`${msg.builder.description}\`\`\`diff\n+ ${Bundle.format(user.lang, 'shop.buyed', item.localName(user), amount, user.money, (user.money -= money * amount))}\`\`\``);
							ent.amount -= amount;
							(button.setCustomId(`${item.localName(user)}${i}${ii}`) as Discord.MessageButton).setLabel(`${item.localName(user)}: ${money + Bundle.format(user.lang, 'unit.money')} (${ent.amount + Bundle.format(user.lang, 'unit.item')} ${Bundle.format(user.lang, 'unit.item_left')})`).setStyle('PRIMARY');

							const isNew = giveItem(user, item, amount);
							if (isNew) msg.builder?.setDescription(`${msg.builder.description}\`\`\`diff\n+ ${isNew}\`\`\``);
							if (!ent.amount) {
								user.enemy.items.items.splice(i, 1);
								buttons[ii].spliceComponents(i, 1);
								msg.builder?.setComponents(buttons);
							}

							save();
						}
						msg.builder?.interaction.editReply({embeds: [msg.builder], components: buttons});
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
			}))).setDisabled(true))
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

							if (amount > ent.amount) {
								msg.builder?.setDescription(`${msg.builder.description}\`\`\`diff\n- ${Bundle.format(user.lang, 'shop.notEnough_item', item.localName(user), amount, ent.amount)}\`\`\``); 
							} else {
								msg.builder?.setDescription(`${msg.builder.description}\`\`\`diff\n+ ${Bundle.format(user.lang, 'shop.sold', item.localName(user), amount, user.money, (user.money += money * amount))}\`\`\``);
								ent.amount -= amount;
								if (!ent.amount) {
									user.inventory.items.splice(i, 1);
									buttons[ii].spliceComponents(i, 1);
									msg.builder?.setComponents(buttons);
								}
								(button.setCustomId(`${item.localName(user)}${i}${ii}`) as Discord.MessageButton).setLabel(`${item.localName(user)}: ${money + Bundle.format(user.lang, 'unit.money')} (${ent.amount + Bundle.format(user.lang, 'unit.item')} ${Bundle.format(user.lang, 'unit.item_left')})`).setStyle('PRIMARY');

								save();
							}
							msg.builder?.interaction.editReply({embeds: [msg.builder], components: buttons});
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
	new EventSelection('back', async (user) => {
		const msg = findMessage(user);
		if(!msg || !msg.builder) return;
		msg.builder.setDescription(`${msg.builder.description}\n\`\`\`\n${Bundle.find(user.lang, 'shop.end')}\n\`\`\``);
		msg.builder.setComponents([]);
		msg.builder = null;
		user.enemy = undefined;
		user.status.clearSelection();
	})
]];

const backSelection = (selection: EventSelection[][]) => new EventSelection('backSelect', (user, components, interactionCallback)=> {
	const msg = findMessage(user);
	if(!msg || !msg.builder) return;
	const data = SelectEvent.toActionData(selection, user);

	msg.builder.setComponents(data.actions).setTriggers(data.triggers);
}, 'button', {
	style: 'SECONDARY'
} as MessageButtonOptions);

export function exchange(user: User, entity: UnitEntity) {
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
}
