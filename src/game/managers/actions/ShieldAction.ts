import { EntityI } from "@/@type/types";
import bundle from "@/assets/Bundle";
import BattleManager from "../BattleManager";
import { BaseAction } from "./BaseAction";

export class ShieldAction extends BaseAction {
  public title = "shield";

  constructor(manager: BattleManager, owner: EntityI, immediate = false) {
    super(manager, owner, 1);

    if (immediate) this.run();
  }

  public async run() {
    super.run();

    this.manager.setShield(this.owner, true);

    await this.manager
      .updateLog(
        bundle.format(
          this.manager.locale,
          "shield_position",
          typeof this.owner.name === "string" ? this.owner.name : this.owner.name(this.manager.locale),
        ),
      )
      .update();
  }

  public description(): string {
    return bundle.find(this.manager.locale, "action.shield.description");
  }

  public isValid(): boolean {
    return !this.manager.isShielded(this.owner);
  }
}
