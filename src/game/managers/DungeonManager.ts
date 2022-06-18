import { CommandInteraction } from "discord.js";
import { findMessage, User } from "..";
import SelectManager from "./SelectManager";

//TODO: make Roguelike Dungeon
export default class DungeonManager extends SelectManager {

  public constructor(user: User, interaction: CommandInteraction, builder = findMessage(interaction.id).builder, last?: SelectManager) {
    super(user, interaction, builder, last);
    if(new.target === DungeonManager) this.init();
	}
	
  protected init() {
    
  }
}