import Discord, { ButtonBuilder, ButtonStyle } from "discord.js";
import * as Discordx from "discordx";
import User from "@/game/User";

@Discordx.Discord()
export default class GeneralComponents {
  @Discordx.ButtonComponent({ id: "closebutton" })
  handler(interaction: Discord.ButtonInteraction) {
    interaction.message.delete();
  }
  @Discordx.ButtonComponent({ id: "weapon_info" })
  private weaponInfoHandler(interaction: Discord.ButtonInteraction) {
    const user = User.findUserByInteraction(interaction);
    const weapon = user.inventory.equipments.weapon;
    weapon.item.showInfo(interaction, weapon);
  }

  @Discordx.ButtonComponent({ id: "inventory_info" })
  private inventoryInfoHandler(interaction: Discord.ButtonInteraction) {
    const user = User.findUserByInteraction(interaction);
    user.showInventoryInfo(interaction).send();
  }
}

export const WeaponInfoButton = new ButtonBuilder()
  .setCustomId("weapon_info")
  .setLabel("show Weapon Info")
  .setStyle(ButtonStyle.Primary);

export const InventoryInfoButton = new ButtonBuilder()
  .setCustomId("inventory_info")
  .setLabel("show Inventory Info")
  .setStyle(ButtonStyle.Primary);

export const CloseButtonComponent = withRowBuilder(
  new Discord.ButtonBuilder({
    custom_id: "closebutton",
    label: "Close",
    style: Discord.ButtonStyle.Danger,
  }),
);

function withRowBuilder<T extends Discord.MessageActionRowComponentBuilder>(
  component: T,
): T & { Row: Discord.ActionRowBuilder<T> } {
  return Object.assign(component, {
    Row: new Discord.ActionRowBuilder<T>().addComponents(component),
  });
}
