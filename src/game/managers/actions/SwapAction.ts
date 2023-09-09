import { EntityI } from "@/@type/types";
import { bundle } from "@/assets";
import { WeaponEntity } from "@/game/Inventory";
import BattleManager from "../BattleManager";
import { BaseAction } from "./BaseAction";

export class SwapAction extends BaseAction {
  public title = "swap";

  constructor(
    manager: BattleManager,
    owner: EntityI,
    private weapon: WeaponEntity,
    immediate = false,
  ) {
    super(manager, owner, 3);

    if (immediate) this.run();
  }

  public async run() {
    super.run();

    this.manager.updateLog(
      bundle.format(
        this.manager.locale,
        "switch_change",
        this.weapon.item.localName(this.manager.locale),
        this.owner.inventory.equipments.weapon.item.localName(this.manager.locale),
      ),
    );
    this.owner.switchWeapon(this.weapon);
  }

  public description(): string {
    return bundle.format(
      this.manager.locale,
      "action.swap.description",
      this.owner.inventory.equipments.weapon.item.localName(this.manager.locale),
      this.weapon.item.localName(this.manager.locale),
    );
  }

  public isValid(): boolean {
    return this.weapon.item.hasWeapon();
  }
}
