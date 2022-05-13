export class ItemEntity { 
	public durability?: number;
	public cooldown?: number;

  public constructor(durability?: number, cooldown?: number) {
		this.durability = durability;
		this.cooldown = cooldown;
	}
}