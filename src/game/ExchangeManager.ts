import Discord, { MessageActionRow, MessageButton, MessageButtonOptions } from 'discord.js';

import { ItemStack, UnitEntity, Items,  getOne, save, findMessage } from '.';
import { EventSelection, SelectEvent } from '../event';
import { Units } from './contents';
import { User, BaseEmbed } from '../modules';
import { bundle } from '../assets';
import { Utils } from '../util';

export default class ExchangeManager {
	target: UnitEntity;
  builder: BaseEmbed;
	locale: string;
	amountSelect?: (amount: number) => void;

	constructor(user: User, target: UnitEntity) {
		this.target = target;
		this.locale = user.getLocale();
		this.builder = findMessage(user).builder as BaseEmbed;

		//고블린 인벤토리 생성
		for (let i = 0; i < 20; i++) {
			const item = getOne(Items.items.filter((i) => i.dropOnShop && i.id !== 5 && (typeof i)));
			const exist = this.target.inventory.items.find((e) => e.id == item.id);
			if (exist) exist.add();
			else this.target.inventory.items.push(new ItemStack(item.id));
		}
		const data = SelectEvent.toActionData(this.selection, user);
		this.builder.setComponents(data.actions).setTriggers(data.triggers).setDescription('').setFields([
			{	name: user.user?.username||'you', value: user.money+bundle.find(this.locale, 'unit.money'), inline: true },
			{	name: Units.find(this.target.id).localName(user), value: this.target.money+bundle.find(this.locale, 'unit.money'), inline: true }
		]);
	}

	waitingSelect(wait: boolean) {
		this.builder.appendedComponents.forEach(row=>{
			row.components.forEach(component=>{
				switch(component.type) {
					case 'BUTTON': {
						component.setDisabled(wait);
						break;
					}
					case 'SELECT_MENU': {
						component.setDisabled(!wait);
						break;
					}
				}
			});
		});
	}

	backSelection(selection: EventSelection[][]) {
		return new EventSelection('back_select', (user, components, interactionCallback)=> {
			const data = SelectEvent.toActionData(selection, user);
			this.builder.setComponents(data.actions).setTriggers(data.triggers);
		}, 'button', {
			style: 'SECONDARY'
		} as MessageButtonOptions);
	}

  amountSelection(selection: EventSelection[][]) {
		return new EventSelection('amount_select', (user, components, interactionCallback)=> {
			if (interactionCallback.isSelectMenu() && this.amountSelect) {
				this.amountSelect(Number(interactionCallback.values[0]));
				this.amountSelect = undefined;
				this.waitingSelect(false);
				this.builder.rerender().catch(e=>e);
				save();
			}
		}, 'select', (user: User) => {
			return {
				placeholder: `1 ${bundle.find(this.locale, 'unit.item')}`,
				options: (()=>new Array(10).fill(0).map((e, i) => ({
					label: `${i + 1} ${bundle.find(this.locale, 'unit.item')}`,
					value: `${i + 1}`
				})))(),
				disabled: true
			}
		});
	}

	selection: EventSelection[][] = [
		(()=>{
			return ['buy', 'sell'].map((name, ind)=>{
				return new EventSelection(name, (user, c, ic, cr) => {
					const owner = name==='buy'?this.target:user;
					const visitor = name==='buy'?user:this.target;

					const {actions: buttons, triggers: triggers} = SelectEvent.toActionData([[this.backSelection(this.selection)], [this.amountSelection(this.selection)]], user);
					Utils.Arrays.division(Array.from(owner.inventory.items), 4).forEach((items, ii) => {
						const components: MessageButton[] = [];
						items.forEach((entity, i) => {
							const item = entity.getItem();
							const localName = item.localName(user);
							const money = (100-item.ratio) * 25;

							triggers.push({
								name: `${localName}${i}${ii}`,
								callback: (interactionCallback, button) => {
									this.waitingSelect(true);
									this.amountSelect = (amount: number) => {
										if (amount > entity.amount) { 
											this.builder.addDescription('- '+bundle.format(this.locale, 'shop.notEnough_item', localName, amount, entity.amount), 'diff'); 
										} 
										else if (visitor.money < amount * money) { 
											this.builder.addDescription('- '+bundle.format(this.locale, 'shop.notEnough_money', amount * money, visitor.money), 'diff'); 
										}
										else {
											owner.money += money * amount;
											visitor.money -= money * amount;
											visitor.giveItem(item, amount);
											entity.remove(amount);
											if (entity.amount <= 0)	owner.inventory.items.splice(owner.inventory.items.indexOf(entity), 1);
											
											(button as Discord.MessageButton).setLabel(`${localName} (${entity.amount + bundle.format(this.locale, 'unit.item')}): ${money + bundle.format(this.locale, 'unit.money')}`).setStyle('PRIMARY');
											this.builder.addDescription('+ '+bundle.format(this.locale, name==='buy'?'shop.buyed':'shop.sold', localName, amount, user.money, (user.money + money * amount * (name==='buy'?-1:1))), 'diff');
											this.selection[0][ind].callback(user, c, ic, cr);
										}
									}
								}
							})
							components.push(new MessageButton().setCustomId(`${localName}${i}${ii}`).setLabel(`${localName} (${entity.amount + bundle.format(this.locale, 'unit.item')}): ${money + bundle.format(this.locale, 'unit.money')}`).setStyle('PRIMARY'));
						})
						buttons.push(new MessageActionRow().setComponents(components));
					})
					this.builder.setComponents(buttons).setTriggers(triggers).setFields([
						{	name: user.user?.username||'you', value: user.money+bundle.find(this.locale, 'unit.money'), inline: true },
						{	name: Units.find(this.target.id).localName(user), value: this.target.money+bundle.find(this.locale, 'unit.money'), inline: true }
				]);
				})
			})
		})().concat(
			new EventSelection('back', async (user) => {
				this.builder.addDescription(bundle.find(this.locale, 'shop.end'));
				this.builder.setComponents([]);
				user.status.clearSelection();
			})
	)];
}