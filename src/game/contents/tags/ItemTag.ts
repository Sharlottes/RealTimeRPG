import { Item } from "..";

export default abstract class ItemTag {
  item: Item;
  constructor(item: Item) {
    this.item = item;
  }
}