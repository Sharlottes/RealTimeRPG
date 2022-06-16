import { CommandInteraction } from 'discord.js';

import { ItemStack, UnitEntity, User, getOne, findMessage } from '@RTTRPG/game';
import { SellManager, BuyManager, SelectManager } from '@RTTRPG/game/managers';
import { Items, Units } from '@RTTRPG/game/contents';
import { bundle } from '@RTTRPG/assets';

export default class ExchangeManager extends SelectManager {
	private target: UnitEntity;

  public constructor(user: User, interaction: CommandInteraction, target: UnitEntity, builder = findMessage(interaction.id).builder, last?: SelectManager) {
    super(user, interaction, builder);
		this.target = target;
    if(new.target === ExchangeManager) this.init();
	}
	
	protected override init() {
		this.addButtonSelection('buy', 0, (user)=>new BuyManager(user, this.interaction, this.target, this.builder, this));
		this.addButtonSelection('sell', 0, (user)=>new SellManager(user, this.interaction, this.target, this.builder, this));
		this.addButtonSelection('back', 0, (user) => {
			this.builder.addDescription(bundle.find(this.locale, 'shop.end'));
			this.builder.setComponents([]);
		});

		//고블린 인벤토리 생성
		for (let i = 0; i < 20; i++) {
			const item = getOne(Items.items.filter((i) => i.dropOnShop && i.id !== 5 && (typeof i)));
			const exist = this.target.inventory.items.find<ItemStack>((store): store is ItemStack => store instanceof ItemStack && store.item == item);
			if (exist) exist.amount++;
			else this.target.inventory.items.push(new ItemStack(item));
		}

		if(this.builder) {
			const data = this.toActionData();
			this.builder.setComponents(data.actions).setTriggers(data.triggers)
			.setFields([
				{	name: this.user.user?.username||'you', value: this.user.money+bundle.find(this.locale, 'unit.money'), inline: true },
				{	name: Units.find(this.target.id).localName(this.user), value: this.target.money+bundle.find(this.locale, 'unit.money'), inline: true }
			]);
		}
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
}