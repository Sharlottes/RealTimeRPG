import { EntityI } from "@/@type/types";
import bundle from "@/assets/Bundle";
import Discord from "discord.js";
import Vars from "@/Vars";

import StatusEffect from "./contents/types/StatusEffect";
import Inventory, { WeaponEntity } from "./Inventory";
import GameManager from "./managers/GameManager";
import StatusEntity from "./StatusEntity";
import Item from "./contents/types/Item";
import Entity from "./Entity";

const defaultStat: Stat = {
  health: 20,
  health_max: 20,
  energy: 100,
  energy_max: 100,
  strength: 0,
  defense: 0,
};

export default class User extends Entity implements EntityI {
  public readonly id: string = "unknown";
  public readonly stats: Stat = defaultStat;
  public readonly inventory: Inventory = new Inventory();
  public name: string = "Unknown User";
  public user: Discord.User;
  public readonly foundContents = { items: [-1], units: [-1] };
  public readonly statuses: StatusEntity[] = [];
  public gameManager?: GameManager | undefined;
  public exp = 0;
  public level = 1;
  public money = 0;
  public locale: string = "en-US";

  constructor(data: Discord.User) {
    super();
    this.user = data;
    this.id = data.id;
    this.name = this.user.username;
  }

  public static findUserByDiscordId(id: string) {
    const user = Vars.userRegistry[id];
    if (!user) throw new Error("cannot find user");
    return user;
  }
  public static findUserByInteraction<T extends Discord.BaseInteraction>(interaction: T) {
    const user = Vars.userRegistry[interaction.user.id];
    if (!user) throw new Error("cannot find user");
    return user;
  }

  public updateData(interaction: Discord.Interaction) {
    this.user ??= interaction.user;
    this.name ??= this.user?.username;
    this.locale = interaction.locale;
  }

  public applyStatus(status: StatusEffect) {
    const exist = this.statuses.find((s) => s.status === status);
    if (exist) exist.duration += status.duration;
    else this.statuses.push(new StatusEntity(status));
  }

  public removeStatus(status: StatusEffect) {
    const index = this.statuses.findIndex((s) => s.status === status);
    if (index != -1) this.statuses.splice(index, 1);
  }

  public giveItem(item: Item, amount = 1) {
    this.inventory.add(item, amount);

    if (!this.foundContents.items.includes(item.id)) {
      this.foundContents.items.push(item.id);
      this.user.send(bundle.format(this.locale, "firstget", item.localName(this)));
    }
  }

  /**
   * 무기를 교체합니다.
   * @param weapon 바꿀 새 무기
   */
  public switchWeapon(entity: WeaponEntity) {
    super.switchWeapon(entity);
  }

  public async levelup() {
    if (this.exp < this.level ** 2 * 50) return;

    await this.user.send(
      bundle.format(
        this.locale,
        "levelup",
        this.user.username,
        this.level,
        this.level + 1,
        this.stats.health_max,
        (this.stats.health_max += Math.round(this.level ** 0.6 * 5 * 100) / 100),
        this.stats.energy_max,
        (this.stats.energy_max += Math.round(this.level ** 0.4 * 2.5 * 100) / 100),
      ),
    );
    this.stats.health = this.stats.health_max;
    this.stats.energy = this.stats.energy_max;
    this.level++;
  }
}
