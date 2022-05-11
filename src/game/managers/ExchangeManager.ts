import { ItemStack, UnitEntity, Items,  getOne, findMessage } from '..';
import { Units } from '../contents';
import { User } from '../../modules';
import { bundle } from '../../assets';
import { SellManager, BuyManager, SelectManager } from '.';

export default class ExchangeManager extends SelectManager {
	private target: UnitEntity;

	constructor(user: User, target: UnitEntity, builder = findMessage(user).builder, last?: SelectManager) {
		super(user, builder, last);
		this.target = target;
    if(new.target === ExchangeManager) this.init();
	}
	
	protected override init() {
		this.addButtonSelection('buy', 0, (user)=>new BuyManager(user, this.target, this.builder, this));
		this.addButtonSelection('sell', 0, (user)=>new SellManager(user, this.target, this.builder, this));
		this.addButtonSelection('back', 0, (user) => {
			this.builder.addDescription(bundle.find(this.locale, 'shop.end'));
			this.builder.setComponents([]);
			user.status.clearSelection();
		});

		//고블린 인벤토리 생성
		for (let i = 0; i < 20; i++) {
			const item = getOne(Items.items.filter((i) => i.dropOnShop && i.id !== 5 && (typeof i)));
			const exist = this.target.inventory.items.find((e) => e.id == item.id);
			if (exist) exist.add();
			else this.target.inventory.items.push(new ItemStack(item.id));
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