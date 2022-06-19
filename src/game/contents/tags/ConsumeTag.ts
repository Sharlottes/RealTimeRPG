import { EntityI } from '@RTTRPG/@type';
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
}