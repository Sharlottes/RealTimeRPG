import { UnitData } from "@/@type/types";
import Inventory from "@/game/Inventory";

import Content from "../Content";
import Units from "../Units";

export default class Unit extends Content implements Rationess {
  readonly level: number;
  readonly ratio: number;
  readonly id: number;
  readonly inventory: Inventory;
  readonly stats: Stat;

  constructor(data: UnitData) {
    super(data.name, "unit");
    this.level = data.level;
    this.ratio = data.ratio;
    this.inventory = data.inventory ?? new Inventory();
    this.stats = data.stats;
    this.id = Units.units.length;
  }
}
