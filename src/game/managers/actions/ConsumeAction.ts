import { EntityI } from "@type/types";
import { bundle } from "assets";
import { Item } from "game/contents";
import BattleManager from "../BattleManager";
import { BaseAction } from "./BaseAction";

export class ConsumeAction extends BaseAction {
  private potion: Item;
  private amount: number;
  public title = "consume";

  constructor(
    manager: BattleManager,
    owner: EntityI,
    potion: Item,
    amount: number,
    immediate = false
  ) {
    super(manager, owner, 5);
    this.potion = potion;
    this.amount = amount;

    if (immediate) this.run();
  }

  public added(): void {
    this.owner.inventory.remove(this.potion, this.amount);
    super.added();
  }

  public undo(): void {
    this.owner.inventory.add(this.potion, this.amount);
    super.undo();
  }

  public async run() {
    super.run();

    this.potion.getConsume().consume(this.owner, this.amount);
    this.manager.updateLog(
      bundle.format(
        this.manager.locale,
        "consume",
        this.potion.localName(this.manager.locale),
        this.amount,
        this.potion
          .getConsume()
          .buffes.map((b) =>
            b.description(this.owner, this.amount, b, this.manager.locale)
          )
          .join("\n  ")
      )
    );
  }

  public description(): string {
    return bundle.format(
      this.manager.locale,
      "action.consume.description",
      this.potion.localName(this.manager.locale),
      this.amount
    );
  }

  public isValid(): boolean {
    return this.potion.hasConsume();
  }
}
