import { Item } from '..';
import ItemTag from './ItemTag';
import { Durable } from '../../../@type/index';

export default class ShieldTag extends ItemTag implements Durable {
  public durability: number;
  constructor(item: Item, durability: number) {
    super(item);
    this.durability = durability;
  }
}