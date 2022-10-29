import { SelectManagerConstructOptions } from '@type';
import SelectManager from './SelectManager';
import Item from 'game/contents/types/Item';
import { bundle } from 'assets';
import { ItemStack } from 'game/Inventory';
import { codeBlock } from '@discordjs/builders';

class PickupManager extends SelectManager {
  public stack?: ItemStack | undefined;
  public money?: number | undefined;

  public constructor(options: SelectManagerConstructOptions & { stack?: ItemStack, money?: number }) {
    super(options);

    this.stack = options.stack;
    this.money = options.money;
  }

  public override init() {
    super.init();

    this.user.money += this.money ?? 0;
    if (this.stack) this.user.giveItem(this.stack.item, this.stack.amount);

    this.setContent(codeBlock(bundle.format(
      this.locale, 'event.pickup',
      this.stack
        ? this.stack.item.localName(this.locale)
        : this.money + bundle.find(this.locale, 'unit.money'),
      this.stack
        ? `${this.stack.item.localName(this.locale)}: +${this.stack.amount}${bundle.find(this.locale, 'unit.item')}`
        : `+${this.money}${bundle.find(this.locale, 'unit.money')}`
    ))).addRemoveButton().update();
  }
}

export default PickupManager;