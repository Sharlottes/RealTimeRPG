import { showInventoryInfo } from "@/game/managers/managerFactory";
import { ButtonStyle } from "discord.js";
import User from "@/game/User";

import ButtonComponent from "./ButtonComponent";
import withRowBuilder from "./withRowBuilder";

export const WeaponInfoButton = new ButtonComponent({
  customId: "weapon_info",
  label: "show Weapon Info",
  style: ButtonStyle.Primary,
  onClick: (interaction) => {
    const user = User.findUserByInteraction(interaction);
    const weapon = user.inventory.equipments.weapon;
    weapon.item.showInfo(interaction, weapon);
  },
});

export const InventoryInfoButton = new ButtonComponent({
  customId: "inventory_info",
  label: "show Inventory Info",
  style: ButtonStyle.Primary,
  onClick: (interaction) => showInventoryInfo(interaction).send(),
});

export const CloseButtonComponent = withRowBuilder(
  new ButtonComponent({
    customId: "closebutton",
    label: "Close",
    style: ButtonStyle.Danger,
    onClick: (interaction) => interaction.message.delete(),
  }),
);
