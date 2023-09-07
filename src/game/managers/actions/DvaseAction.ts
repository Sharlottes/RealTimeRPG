import { EntityI } from "@/@type/types";
import { bundle } from "@/assets";
import BattleManager from "../BattleManager";
import { BaseAction } from "./BaseAction";

export class DvaseAction extends BaseAction {
  public title = "dvase";

  constructor(manager: BattleManager, owner: EntityI, immediate = false) {
    super(manager, owner, 0);

    if (immediate) this.run();
  }

  public async run() {
    super.run();

    this.manager.setEvasion(this.owner, false);

    await this.manager
      .updateLog(
        bundle.format(
          this.manager.locale,
          "dvasion_position",
          typeof this.owner.name === "string"
            ? this.owner.name
            : this.owner.name(this.manager.locale),
        ),
      )
      .update();
  }

  public description(): string {
    return bundle.find(this.manager.locale, "action.dvase.description");
  }

  public isValid(): boolean {
    return this.manager.isEvasion(this.owner);
  }
}
