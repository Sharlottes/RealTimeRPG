import StatusEntity from "@/game/StatusEntity";
import { EntityI } from "@/@type/types";

import StatusEffects from "../StatusEffects";
import Content from "../Content";

export default class StatusEffect extends Content {
  readonly id: number;
  public multiplier = 1;

  constructor(
    name: string,
    public readonly duration = -1,
    public readonly callback: (entity: EntityI, status: StatusEntity) => void = () => {},
  ) {
    super(name, "status");

    this.id = StatusEffects.statuses.length;
    StatusEffects.statuses.push(this);
  }

  setMultiplier(multiplier: number): this {
    this.multiplier = multiplier;
    return this;
  }
}
