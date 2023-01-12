import { EntityI } from "@type";
import { Content, StatusEffects } from "..";
import { StatusEntity } from "../..";

export default class StatusEffect extends Content {
  readonly id: number;
  public multiplier = 1;

  constructor(
    name: string,
    public readonly duration = -1,
    public readonly callback: (
      entity: EntityI,
      status: StatusEntity
    ) => void = () => {}
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
