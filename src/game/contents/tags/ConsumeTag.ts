import { EntityI } from '@RTTRPG/@type';
import { ItemEntity } from '@RTTRPG/game/Inventory';
import { BaseEmbed } from '@RTTRPG/modules';
import Buff from '../Buff';
import Item from '../Item';
import ItemTag from './ItemTag';

export default class ConsumeTag extends ItemTag {
  buffes: Buff[];
  
  constructor(item: Item, buffes: Buff[]) {
    super(item);
    this.buffes = buffes;
  }
  
	consume(owner: EntityI, amount = 1) {
		this.buffes.forEach((b) => b.buff(owner, amount));
	}

  //TODO: 버프 설명 구체화
  public buildInfo(builder: BaseEmbed, entity?: ItemEntity | undefined): BaseEmbed {
    return builder.addField('buffes', this.buffes.map<string>(buff => buff.localName('en-US')).join('\n'));
  }
}