import Random from "random";
import { BaseAction } from "./BaseAction";
import { EntityI } from "@/@type/types";
import { bundle } from "@/assets";
import { Items } from "@/game/contents";
import { WeaponEntity } from "@/game/Inventory";
import BattleManager from "../BattleManager";
import { predicateOf } from "@/utils/predicateOf";

export class AttackAction extends BaseAction {
  public title = "attack";

  constructor(
    manager: BattleManager,
    owner: EntityI,
    private enemy: EntityI,
    private weapon: WeaponEntity,
    immediate = false,
  ) {
    super(manager, owner, 10);
    if (immediate) this.run();
  }

  public async run(): Promise<void> {
    super.run();

    if (this.owner.stats.health <= 0 || this.enemy.stats.health <= 0) return;
    const isUser = this.owner.id == this.manager.user.id;
    const prefixed = (content: string, benefit = true) =>
      `${(benefit ? isUser : !isUser) ? "+" : "-"} ${content}`;
    const name =
      typeof this.enemy.name === "string"
        ? this.enemy.name
        : this.enemy.name(this.manager.locale);
    if (this.manager.isEvasion(this.enemy)) {
      if (Random.bool()) {
        await this.manager
          .updateLog(
            prefixed(
              bundle.format(this.manager.locale, "evasion_successed", name),
              false,
            ),
          )
          .update();
      } else {
        await this.manager
          .updateLog(
            prefixed(
              bundle.format(this.manager.locale, "evasion_failed", name),
            ),
          )
          .update();
        await this.manager
          .updateLog(
            prefixed(
              this.weapon.item
                .getWeapon()
                .attack(this.enemy, this.weapon, this.manager.locale),
            ),
          )
          .update();
      }
    } else if (
      this.manager.isShielded(this.enemy) &&
      this.enemy.inventory.equipments.shield
    ) {
      this.enemy.inventory.equipments.shield.durability -=
        this.owner.inventory.equipments.weapon.item.getWeapon().damage;
      await this.manager
        .updateLog(
          prefixed(bundle.format(this.manager.locale, "shielded", name), false),
        )
        .update();
    } else {
      await this.manager
        .updateLog(
          prefixed(
            this.weapon.item
              .getWeapon()
              .attack(this.enemy, this.weapon, this.manager.locale),
          ),
        )
        .update();
    }

    if (this.weapon.item != Items.punch && this.weapon.item != Items.none) {
      if (this.weapon.durability > 0) this.weapon.durability--;
      if (this.weapon.durability <= 0) {
        await this.manager
          .updateLog(
            bundle.format(
              this.manager.locale,
              "battle.broken",
              this.weapon.item.localName(this.manager.locale),
            ),
          )
          .update();
        const exist = this.owner.inventory.items.find(
          predicateOf<WeaponEntity>()(
            (store) =>
              store instanceof WeaponEntity &&
              store.item == this.owner.inventory.equipments.weapon.item,
          ),
        );
        if (exist) {
          this.owner.inventory.items.splice(
            this.owner.inventory.items.indexOf(exist),
            1,
          );
          this.owner.inventory.equipments.weapon = exist;
          this.manager.updateLog(
            bundle.find(this.manager.locale, "battle.auto_swap"),
          );
          await this.manager.update();
        } else
          this.owner.inventory.equipments.weapon = new WeaponEntity(
            Items.punch,
          );
      }
    }
  }

  public description(): string {
    const enemyName =
      typeof this.enemy.name !== "string"
        ? this.enemy.name(this.manager.locale)
        : this.enemy.name;
    const weaponName = this.owner.inventory.equipments.weapon.item.localName(
      this.manager.locale,
    );
    return bundle.format(
      this.manager.locale,
      "action.attack.description",
      enemyName,
      weaponName,
    );
  }

  public isValid(): boolean {
    return this.owner.inventory.equipments.weapon.cooldown == 0;
  }
}
