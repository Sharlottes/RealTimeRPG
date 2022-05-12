import Discord, { MessageButton, MessageActionRow } from 'discord.js';
import { findMessage, save, Units, User, UnitEntity } from '@RTTRPG/game';
import { BaseEmbed } from '@RTTRPG/modules';
import { bundle } from '@RTTRPG/assets';
import { Utils } from '@RTTRPG/util';
import { SelectManager } from '.';

export default class BuyManager extends SelectManager {
	private target: UnitEntity;
	private amountSelect?: (amount: number) => void;

	constructor(user: User, target: UnitEntity, builder = findMessage(user).builder as BaseEmbed, last?: SelectManager) {
		super(user, builder, last);
		this.target = target;
    if(new.target === BuyManager) this.init();
	}
	
	protected override init() {
    super.init();
		this.addMenuSelection('amount_select', 1, (user, components, interactionCallback)=> {
			if (interactionCallback.isSelectMenu() && this.amountSelect) {
				this.amountSelect(Number(interactionCallback.values[0]));
				this.amountSelect = undefined;
				this.waitingSelect(false);
				this.builder.rerender().catch(e=>e);
				save();
			}
		},
		{
			placeholder: `1 ${bundle.find(this.locale, 'unit.item')}`,
			options: (()=>new Array(10).fill(0).map((e, i) => ({
				label: `${i + 1} ${bundle.find(this.locale, 'unit.item')}`,
				value: `${i + 1}`
			})))(),
			disabled: true
		});


    const owner = this.target;
    const visitor = this.user;
    
    const {actions: buttons, triggers: triggers} = this.toActionData();
    Utils.Arrays.division(Array.from(owner.inventory.items), 4).forEach((items, ii) => {
      const components: MessageButton[] = [];
      items.forEach((entity, i) => {
        const item = entity.getItem();
        const localName = item.localName(this.user);
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
                this.builder.addDescription('+ '+bundle.format(this.locale, 'shop.buyed', localName, amount, this.user.money, (this.user.money + money * -amount)), 'diff');
              }
            }
          }
        })
        components.push(new MessageButton().setCustomId(`${localName}${i}${ii}`).setLabel(`${localName} (${entity.amount + bundle.format(this.locale, 'unit.item')}): ${money + bundle.format(this.locale, 'unit.money')}`).setStyle('PRIMARY'));
      })
      buttons.push(new MessageActionRow().setComponents(components));
    })
    this.builder.setComponents(buttons).setTriggers(triggers).setFields([
      {	name: this.user.user?.username||'you', value: this.user.money+bundle.find(this.locale, 'unit.money'), inline: true },
      {	name: Units.find(this.target.id).localName(this.user), value: 
        this.target.money+bundle.find(this.locale, 'unit.money'), inline: true }
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
}