import { EmbedBuilder } from 'discord.js';

import { getOne } from "utils/getOne";
import { ItemStack, ItemStorable, UnitEntity } from 'game';
import SelectManager from 'game/managers/SelectManager';
import { Item, Items } from 'game/contents';
import { bundle } from 'assets';
import ItemSelectManager from './ItemSelectManager';
import { EntityI, SelectManagerConstructOptions } from '@type';

export default class ExchangeManager extends SelectManager {
	private readonly target: UnitEntity;
	private readonly mainEmbed: EmbedBuilder;

	public constructor(options: SelectManagerConstructOptions & { target: UnitEntity }) {
		super(options);
		this.target = options.target;
		//TODO: 구현하기
		this.mainEmbed = new EmbedBuilder()
			.setTitle("WIP")
			.setDescription("WIP");
	}

	public override init() {
		super.init();
		this.setEmbeds(this.mainEmbed);

		//고블린 인벤토리 생성
		for (let i = 0; i < 20; i++) {
			const item = getOne(Items.items.filter((i) => i.dropOnShop && i.id !== 5 && (typeof i)));
			const exist = this.target.inventory.items.find<ItemStack>((store): store is ItemStack => store instanceof ItemStack && store.item == item);
			if (exist) exist.amount++;
			else this.target.inventory.items.push(new ItemStack(item));
		}

		this.addButtonSelection('back', 0, () => {
			this.addContent(bundle.find(this.locale, 'shop.end'));
			this.setComponents();
			this.addRemoveButton();
			this.update();
		});


		const buyRefresher = this.addMenuSelection({
			customId: 'buy',
			row: 1,
			callback: async (interaction) => {
				if (!interaction.isSelectMenu()) return;
				const id = interaction.values[0];
				const store = this.target.inventory.items[Number(id)];

				if (store instanceof ItemStack && store.amount > 1) {
					ItemSelectManager.start<typeof ItemSelectManager>({
						user: this.user,
						interaction: this.interaction,
						item: store,
						callback: async amount => {
							await this.deal(this.target, this.user, store, amount);
							await buyRefresher();
							await this.updateEmbed();
						}
					});
				} else {
					await this.deal(this.target, this.user, store, 1);
				}
				await this.updateEmbed();
			},
			reducer: (store, index) => ({
				label: store.item.localName(this.locale) + ` ${(store instanceof ItemStack ? store.amount : 1)} ${bundle.find(this.locale, "unit.item")}, ${this.calPrice(store.item)} ${bundle.find(this.locale, "unit.money")}`,
				value: index.toString()
			}),
			list: this.target.inventory.items,
			placeholder: 'select item to buy ...'
		});

		const sellRefresher = this.addMenuSelection({
			customId: 'sell',
			row: 2,
			callback: async (interaction) => {
				if (!interaction.isSelectMenu()) return;
				const id = interaction.values[0];
				const store = this.user.inventory.items[Number(id)];
				if (store instanceof ItemStack && store.amount > 1) {
					ItemSelectManager.start<typeof ItemSelectManager>({
						user: this.user,
						interaction: this.interaction,
						item: store,
						callback: async amount => {
							await this.deal(this.user, this.target, store, amount);
							await sellRefresher();
							await this.updateEmbed();
						}
					});
				} else {
					await this.deal(this.user, this.target, store, 1);
				}
				await this.updateEmbed();
			},
			reducer: (store, index) => ({
				label: store.item.localName(this.locale) + ` ${(store instanceof ItemStack ? store.amount : 1)} ${bundle.find(this.locale, "unit.item")}, ${this.calPrice(store.item)} ${bundle.find(this.locale, "unit.money")}`,
				value: index.toString()
			}),
			list: this.user.inventory.items,
			placeholder: 'select item to sell ...'
		});

		this.mainEmbed.setFields([
			{ name: this.user.user.username, value: this.user.money + bundle.find(this.locale, 'unit.money'), inline: true },
			{ name: this.target.type.localName(this.locale), value: this.target.money + bundle.find(this.locale, 'unit.money'), inline: true }
		]);
	}


	private calPrice(item: Item) {
		return Math.round((100 - item.ratio) * 3);
	}

	private async updateEmbed() {
		this.mainEmbed.setFields([
			{ name: this.user.user.username, value: this.user.money + bundle.find(this.locale, 'unit.money'), inline: true },
			{ name: this.target.type.localName(this.locale), value: this.target.money + bundle.find(this.locale, 'unit.money'), inline: true }
		]);
		await this.update();
	}

	private async deal<T extends ItemStorable>(owner: EntityI, visitor: EntityI, store: T, amount: number) {
		const max = store instanceof ItemStack ? store.amount : 1;
		const item = store.item;
		const money = this.calPrice(item);

		if (amount > max) {
			this.addContent('- ' + bundle.format(this.locale, 'shop.notEnough_item', item.localName(this.locale), amount, max), 'diff');
		}
		else if (visitor.money < amount * money) {
			this.addContent('- ' + bundle.format(this.locale, 'shop.notEnough_money', amount * money, visitor.money), 'diff');
		} else {
			this.addContent('+ ' + bundle.format(this.locale, owner == this.user ? 'shop.sold' : 'shop.buyed', item.localName(this.locale), amount, owner.money, (owner.money + money * amount)), 'diff');

			visitor.money -= money * amount;
			visitor.inventory.add(item, amount);
			owner.money += money * amount;
			owner.inventory.remove(item, amount);
		}

		await this.updateEmbed();
	}
}