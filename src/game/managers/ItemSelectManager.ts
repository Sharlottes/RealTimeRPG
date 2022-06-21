import { CommandInteraction, MessageEmbed } from "discord.js";
import { ItemStack, User } from "..";
import SelectManager from "./SelectManager";
import { BaseEmbed } from '../../modules/BaseEmbed';
import BaseManager from './BaseManager';
import { bundle } from '../../assets/index';
import { Item } from "../contents";

export default class ItemSelectManager extends SelectManager {
	private amount = 0;
  private stack: ItemStack;
  private callback: (amount: number)=>void;

  public constructor(user: User, interaction: CommandInteraction, item: Item|ItemStack, callback: (amount: number)=>void, builder = new BaseEmbed(interaction).setPages(new MessageEmbed()), last?: SelectManager) {
    super(user, interaction, builder, last);
    this.stack = item instanceof ItemStack ? item : new ItemStack(item);
    this.callback = callback;
		if(new.target === ItemSelectManager) this.init();
	}
  
  protected override async init() {
    for(let i = 1; i <= 9; i++) {
    	this.addButtonSelection(i.toString(), Math.floor((i-1)/3), () => {
	      this.amount = this.amount*10+i;
        this.updateEmbed();
      });
    }
    this.addButtonSelection('0', 3, () => {
      this.amount = this.amount*10;
      this.updateEmbed();
      });
    this.addButtonSelection("del", 3, () => {
      this.amount = Math.floor(this.amount/10);
      this.updateEmbed();
    }, {style: 'DANGER'});
    this.addButtonSelection("done", 3, () => {
      if(this.amount > this.stack.amount) {
        BaseManager.newErrorEmbed(this.user, this.interaction, bundle.format(this.locale, "shop.notEnough_item", this.stack.item.localName(this.locale), this.amount, this.stack.amount));
      } else {
        this.callback(this.amount);
        this.builder.remove();
      }
    }, {style: 'SUCCESS'});
    this.addButtonSelection("cancel", 4, () => {
      this.builder.remove();
    }, {style: 'SECONDARY'});
    this.addButtonSelection("reset", 4, () => {
      this.amount = 0;
      this.updateEmbed();
    }, {style: 'SECONDARY'});
    this.addButtonSelection("max", 4, () => {
      this.amount = this.stack.amount;
      this.updateEmbed();
    }, {style: 'SECONDARY'});
    const data = this.toActionData();
		this.builder
      .setTitle("ItemPad")
			.setFields([{name: "Item", value: this.stack.item.localName(this.locale)}, {name: "Amount", value: this.amount.toString()}])
			.setComponents(data.actions).setTriggers(data.triggers).build();
  }
  
  public updateEmbed() {
    this.builder.setFields([{name: "Item", value: this.stack.item.localName(this.locale)}, {name: "Amount", value: this.amount.toString()}]);
    this.builder.getComponents()[3].components[2].setDisabled(this.amount > this.stack.amount);
  }
}
