import { StatusEffect } from './contents';

export default class StatusEntity { 
  	public constructor(public status: StatusEffect, public duration = status.duration, public power = status.power) { }
}