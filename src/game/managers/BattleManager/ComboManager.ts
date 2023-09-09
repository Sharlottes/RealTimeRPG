import bundle from "@/assets/Bundle";
import Items from "@/game/contents/Items";
import StatusEffects from "@/game/contents/StatusEffects";
import { AttackAction } from "../actions/AttackAction";
import type { SlotWeaponEntity } from "@/game/Inventory";
import type { BaseAction } from "../actions/BaseAction";
import type BattleManager from "@/game/managers/BattleManager/index";

class ComboManager {
  private readonly comboQueue: string[] = [];
  private readonly comboList: Map<string, (manager: BattleManager) => Promise<void>> = new Map<
    string,
    () => Promise<void>
  >();

  public addCombo(actions: string, callback: (manager: BattleManager) => Promise<void>): this {
    this.comboList.set(actions, callback);
    return this;
  }

  public async onAction(action: BaseAction, manager: BattleManager) {
    this.comboQueue.push(action.title);

    const callback = this.comboList.get(this.comboQueue.join("-"));
    if (!callback) return;
    this.comboQueue.length = 0;
    await callback(manager);
  }
}

export default new ComboManager()
  .addCombo("reload-attack-evase", async (manager) => {
    (manager.turn.inventory.equipments.weapon as SlotWeaponEntity).ammos.push(
      Items.find(0),
      Items.find(0),
      Items.find(0),
    );
    await manager.updateLog(bundle.find(manager.locale, "combo.evasing_attack")).update();
    new AttackAction(
      manager,
      manager.turn,
      manager.turn == manager.user ? manager.enemy : manager.user,
      manager.user.inventory.equipments.weapon,
      true,
    );
  })
  .addCombo("consume-consume-consume", async (manager) => {
    manager.turn.stats.health += 5;
    await manager.updateLog(bundle.find(manager.locale, "combo.overeat")).update();
  })
  .addCombo("evase-dvase-evase", async (manager) => {
    manager.getItsOpponent(manager.turn)?.applyStatus(StatusEffects.annoyed);
    await manager.updateLog(bundle.find(manager.locale, "combo.tea_bagging")).update();
  });
