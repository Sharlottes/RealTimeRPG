import { StatusEffect } from "./contents";

export default class StatusEntity {
  public constructor(
    public status: StatusEffect,
    public duration = status.duration,
    public multiplier = status.multiplier,
  ) {}
  public getValue(value: number) {
    return (this.multiplier * value) / this.status.duration;
  }
}
