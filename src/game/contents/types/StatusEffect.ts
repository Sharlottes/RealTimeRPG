import { EntityI } from "@type";
import { Content, StatusEffects } from "..";
import { StatusEntity } from "../..";

export default class StatusEffect extends Content {
	readonly id: number;
  readonly duration: number;
  readonly power: number;
  readonly callback: (entity: EntityI, status: StatusEntity) => void;

  constructor(name: string, duration = -1, power = 1, callback: (entity: EntityI, status: StatusEntity) => void = ()=>{return}) {
    super(name, 'status');
    this.duration = duration;
    this.power = power;
    this.callback = callback;
    this.id = StatusEffects.statuses.length;
  }
}