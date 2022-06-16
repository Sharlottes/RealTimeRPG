import { StatusEffect } from './contents';

export default class StatusEntity { 
	public status: StatusEffect;
	public duration: number;
  public power: number;

  public constructor(status: StatusEffect, duration = status.duration, power = status.power) {
		this.status = status;
		this.duration = duration;
    this.power = power;
	}
}