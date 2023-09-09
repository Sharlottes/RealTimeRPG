import StatusEffect from "./contents/types/StatusEffect";

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
