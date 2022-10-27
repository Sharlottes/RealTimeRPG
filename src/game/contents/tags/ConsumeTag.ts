import { EntityI } from '@type';
import { ItemEntity } from 'game/Inventory';
import { EmbedBuilder } from 'discord.js';
import Buff from '../Buff';
import Item from '../types/Item';
import ItemTag from './ItemTag';

export default class ConsumeTag extends ItemTag {
  public readonly buffes: Buff[];
  public readonly name = "Consume";
  
  constructor(item: Item, buffes: Buff[]) {
    super(item);
    this.buffes = buffes;
  }
  
	public consume(owner: EntityI, amount = 1) {
		this.buffes.forEach((b) => b.buff(owner, amount));
	}

  //TODO: 버프 설명 구체화
  public buildInfo(embed: EmbedBuilder, entity?: ItemEntity | undefined): EmbedBuilder {
    return embed.addField('buffes', this.buffes.map<string>(buff => buff.localName('en-US')).join('\n'));
  }
}