import { ItemStack } from "..";
import SelectManager from "./SelectManager";
import { bundle } from '../../assets/index';
import { Item } from "../contents";
import { SelectManagerConstructOptions } from "@type";
import Manager from "./Manager";
import { ButtonStyle, EmbedBuilder } from "discord.js";

export default class ItemSelectManager extends SelectManager {
	private amount = 0;
  private readonly mainEmbed: EmbedBuilder;
  private readonly stack: ItemStack;
  private readonly callback: (amount: number)=>void;

  public constructor(options: SelectManagerConstructOptions & { item: Item|ItemStack, callback: (amount: number) => void }) {
    super(options);
    this.stack = options.item instanceof ItemStack ? options.item : new ItemStack(options.item);
    this.callback = options.callback;
    this.mainEmbed = new EmbedBuilder().setTitle("ItemPad").setFields([
      {name: `Item (${this.stack.amount})`, value: this.stack.item.localName(this.locale)}, 
      {name: "Amount", value: this.amount.toString()}
    ]);
	}
  
  public override async init() {
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
    }, { style: ButtonStyle.Danger });
    this.addButtonSelection("done", 3, () => {
      if(this.amount > this.stack.amount) {
        Manager.newErrorEmbed(this.interaction, bundle.format(this.locale, "shop.notEnough_item", this.stack.item.localName(this.locale), this.amount, this.stack.amount));
      } else {
        this.callback(this.amount);
        this.remove();
      }
    }, { style: ButtonStyle.Success });
    this.addButtonSelection("cancel", 4, () => {
      this.remove();
    }, { style: ButtonStyle.Secondary });
    this.addButtonSelection("reset", 4, () => {
      this.amount = 0;
      this.updateEmbed();
    }, { style: ButtonStyle.Secondary });
    this.addButtonSelection("max", 4, () => {
      this.amount = this.stack.amount;
      this.updateEmbed();
    }, { style: ButtonStyle.Secondary });
		this.setEmbeds([ this.mainEmbed ]);
  }
  
  private updateEmbed() {
    this.mainEmbed.setFields([
      {
        name: `Item (${this.stack.amount})`, 
        value: this.stack.item.localName(this.locale)}, 
      {
        name: "Amount", 
        value: this.amount.toString()
      }
    ]);
    this.components[3].components[2].setDisabled(this.amount > this.stack.amount);
    this.update();
  }
}