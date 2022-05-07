import Discord, { MessageActionRow, MessageActionRowComponent, MessageActionRowComponentResolvable, MessageButton, MessageButtonOptions, MessageSelectMenu, MessageSelectMenuOptions } from 'discord.js';

import { ITrigger } from 'discord.js-pages';
import { User } from '../modules';
import { UnitEntity, Items } from '.';
import { Item, ItemStack } from './contents';
import { Durable } from '@뇌절봇/@type';
import Assets from '../assets';
import { EventSelection, SelectEvent } from '../event';

import { getOne, save, findMessage } from './rpg_';
import { Utils } from '@뇌절봇/util';

/**
 * 선택 인터렉션과 기타 인터렉션을 활성/비활성합니다.
 * @param buttons 비활성화시킬 버튼 그룹, 매우 수동적임
 * @param wait 대기/대기해제
 */
function waitingSelect(buttons: MessageActionRow[], wait: boolean) {
	buttons.slice(0, Math.min(buttons.length - 1, buttons.length - 2)).forEach((b) => b.components.forEach((bb) => bb.setDisabled(wait)));
	buttons[buttons.length - 1].components.forEach((b) => b.setDisabled(!wait));
}

const Bundle = Assets.bundle;

const exchangeSelection: EventSelection[][] = [[
	new EventSelection('buy', (user) => {
		if (!user.enemy) return;

		const locale = user.getLocale();
		const out = Utils.Arrays.division(Array.from(user.enemy.items.items), 4);
		const triggers: ITrigger<MessageActionRowComponent>[] = [];
		const buttons = out.map((items, ii) => {
			const components: MessageButton[] = [];
			items.forEach((entity, i) => {
				const ent = user.enemy?.items.items.find((e) => e.id == entity.id);
				if (!ent) return;
				const item: Item = ItemStack.getItem(ent);
				const money = (100-item.ratio) * 25;

				triggers.push({
					name: `${item.localName(user)}${i}${ii}`,
					callback(interactionCallback, button) {
						waitingSelect(buttons, true);

						user.status.callback = (amount: number) => {
							const builder = findMessage(user).builder;
							if (!user.enemy || !builder) return;
							user.status.callback = undefined;
							waitingSelect(buttons, false);

							if (amount > ent.amount) { 
								builder.addDescription('- '+Bundle.format(locale, 'shop.notEnough_item', item.localName(user), amount, ent.amount), 'diff'); 
							} 
							else if (user.money < amount * money) { 
								builder.addDescription('- '+Bundle.format(locale, 'shop.notEnough_money', amount * money, user.money), 'diff'); 
							}
							else {
								user.giveItem(item, amount);

								//아이템 수량 차감, 떨어졌으면 인벤토리와 버튼 그룹에서 삭제
								ent.amount -= amount;
								if (!ent.amount) {
									user.enemy.items.items.splice(user.enemy.items.items.indexOf(entity), 1);
									if(row.components.length == 1) buttons.splice(buttons.indexOf(row), 1);
									else row.spliceComponents(row.components.indexOf(button), 1);
								}

								(button as Discord.MessageButton).setLabel(`${item.localName(user)}: ${money + Bundle.format(locale, 'unit.money')} (${ent.amount + Bundle.format(locale, 'unit.item')} ${Bundle.format(locale, 'unit.item_left')})`).setStyle('PRIMARY');
								builder.addDescription('+ '+Bundle.format(locale, 'shop.buyed', item.localName(user), amount, user.money, (user.money -= money * amount)), 'diff');
							}

							builder.rerender();
						};
					}
				});
				components.push(new MessageButton().setCustomId(`${item.localName(user)}${i}${ii}`).setLabel(`${item.localName(user)}: ${money + Bundle.format(locale, 'unit.money')} (${ent.amount + Bundle.format(locale, 'unit.item')} ${Bundle.format(locale, 'unit.item_left')})`).setStyle('PRIMARY'));
			});

			const row = new MessageActionRow().setComponents(components);
			return row;
		});
		
		const data = SelectEvent.toActionData([[backSelection(exchangeSelection)], [amountSelection(exchangeSelection)]], user);
		findMessage(user).builder?.setComponents(buttons).setTriggers(triggers).addComponents(data.actions).addTriggers(data.triggers);
	}),
	new EventSelection('sell', (user) => {
			const locale = user.getLocale();
			const out = Utils.Arrays.division(Array.from(user.inventory.items), 4);
			const triggers: ITrigger<MessageActionRowComponent>[] = [];
			const buttons = out.map((items, ii) => {
				const components: MessageButton[] = [];
				items.forEach((entity, i) => {
					const item = ItemStack.getItem(entity);
					if(!item) return;
					const money = (100-item.ratio) * 10;

					triggers.push({
						name: `${item.localName(user)}${i}${ii}`,
						callback(interactionCallback, button) {
							waitingSelect(buttons, true);

							user.status.callback = (amount: number) => {
								const builder = findMessage(user).builder;
								if(!builder) return;
								user.status.callback = undefined;
								waitingSelect(buttons, false);

								if (amount > entity.amount) {
									builder.addDescription('- '+Bundle.format(locale, 'shop.notEnough_item', item.localName(user), amount, entity.amount), 'diff'); 
								} else {
									//아이템 수량 차감, 떨어졌으면 인벤토리와 버튼 그룹에서 삭제
									entity.amount -= amount;
									if (!entity.amount) {
										user.inventory.items.splice(user.inventory.items.indexOf(entity), 1);
										if(row.components.length==1) buttons.splice(buttons.indexOf(row), 1);
										else row.spliceComponents(row.components.indexOf(button), 1);
										builder.setComponents(buttons);
									}

									(button as Discord.MessageButton).setLabel(`${item.localName(user)}: ${money + Bundle.format(locale, 'unit.money')} (${entity.amount + Bundle.format(locale, 'unit.item')} ${Bundle.format(locale, 'unit.item_left')})`).setStyle('PRIMARY');
									builder.addDescription('+ '+Bundle.format(locale, 'shop.sold', item.localName(user), amount, user.money, (user.money += money * amount)), 'diff');
									
									save();
								}

								builder.rerender();
							};
						},
					});
					components.push(new MessageButton().setCustomId(`${item.localName(user)}${i}${ii}`).setLabel(`${item.localName(user)}: ${money + Bundle.format(locale, 'unit.money')} (${entity.amount + Bundle.format(locale, 'unit.item')} ${Bundle.format(locale, 'unit.item_left')})`).setStyle('PRIMARY'));
				});
				const row = new MessageActionRow().setComponents(components);
				return row;
			});
			
		const data = SelectEvent.toActionData([[backSelection(exchangeSelection)], [amountSelection(exchangeSelection)]], user);
		findMessage(user).builder?.setComponents(buttons).setTriggers(triggers).addComponents(data.actions).addTriggers(data.triggers);
	}),
	new EventSelection('back', async (user) => {
		const builder = findMessage(user).builder;
		if(!builder) return;
		builder.addDescription(Bundle.find(user.getLocale(), 'shop.end'));
		user.enemy = undefined;
		user.status.clearSelection();
		builder.setComponents([]);
	})
]];

const backSelection = (selection: EventSelection[][]) => new EventSelection('back_select', (user, components, interactionCallback)=> {
	const data = SelectEvent.toActionData(selection, user);
	findMessage(user).builder?.setComponents(data.actions).setTriggers(data.triggers);
}, 'button', {
	style: 'SECONDARY'
} as MessageButtonOptions);

const amountSelection = (selection: EventSelection[][]) => new EventSelection('amount_select', (user, components, interactionCallback)=> {
	if (interactionCallback.isSelectMenu() && user.status.callback) user.status.callback(Number(interactionCallback.values[0]));
}, 'select', (user: User) => {
	return {
		placeholder: `1 ${Bundle.find(user.getLocale(), 'unit.item')}`,
		options: (()=>new Array(10).fill(0).map((e, i) => ({
			label: `${i + 1} ${Bundle.find(user.getLocale(), 'unit.item')}`,
			value: `${i + 1}`
		})))(),
		disabled: true
	}
});

export function exchange(user: User, entity: UnitEntity) {
	//고블린 인벤토리 생성
	for (let i = 0; i < 20; i++) {
		const item = getOne(Items.items.filter((i) => i.dropOnShop && i.id !== 5 && (typeof i)));
		const exist = entity.items.items.find((e) => e.id == item.id);
		if (exist) exist.amount++;
		else entity.items.items.push(new ItemStack(item.id, 1, (item as unknown as Durable).durability));
	}
	user.enemy = entity;

	const data = SelectEvent.toActionData(exchangeSelection, user);
	findMessage(user).builder?.setComponents(data.actions).setTriggers(data.triggers);
}
