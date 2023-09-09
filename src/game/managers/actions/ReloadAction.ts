import { EntityI } from "@/@type/types";
import bundle from "@/assets/Bundle";
import { ItemStack, SlotWeaponEntity } from "@/game/Inventory";
import BattleManager from "../BattleManager";
import { BaseAction } from "./BaseAction";

export class ReloadAction extends BaseAction {
  public title = "reload";

  constructor(
    manager: BattleManager,
    owner: EntityI,
    public stack: ItemStack,
    immediate = false,
  ) {
    super(manager, owner, 1);

    if (immediate) this.run();
  }

  public added(): void {
    this.owner.inventory.remove(this.stack.item, this.stack.amount);
    super.added();
  }

  public undo(): void {
    this.owner.inventory.add(this.stack.item, this.stack.amount);
    super.undo();
  }

  public async run() {
    super.run();

    const entity = this.owner.inventory.equipments.weapon;
    if (entity instanceof SlotWeaponEntity) {
      const inc = this.stack.item.getAmmo()?.itemPerAmmo ?? 1;
      this.owner.inventory.remove(this.stack.item, this.stack.amount);
      for (let i = 0; i < this.stack.amount; i += inc) entity.ammos.push(this.stack.item);
      this.manager.updateLog(
        bundle.format(
          this.manager.locale,
          "reload",
          this.stack.item.localName(this.manager.locale),
          this.stack.amount,
          this.owner.inventory.equipments.weapon.item.localName(this.manager.locale),
        ),
      );
    }
  }

  public description(): string {
    return bundle.format(
      this.manager.locale,
      "action.reload.description",
      this.stack.item.localName(this.manager.locale),
      this.stack.amount,
      this.owner.inventory.equipments.weapon.item.localName(this.manager.locale),
    );
  }

  public isValid(): boolean {
    return this.stack.item.hasAmmo();
  }
}
