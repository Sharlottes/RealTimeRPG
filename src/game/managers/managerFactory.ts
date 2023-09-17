import { InventoryInfoButton, WeaponInfoButton, CloseButtonComponent } from "@/command/components/GeneralComponents";
import Discord, { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, EmbedBuilder } from "discord.js";
import { filledBar } from "string-progressbar";
import bundle from "@/assets/Bundle";
import Bundle from "@/assets/Bundle";
import Canvas from "@/utils/Canvas";
import Canvass from "canvas";

import Manager from "./Manager";
import User from "../User";

export function showInventoryInfo(
  interaction: Discord.BaseInteraction,
  user = User.findUserByInteraction(interaction),
) {
  return new Manager({
    interaction,
    embeds: [
      new Discord.EmbedBuilder().setTitle(bundle.find(user.locale, "inventory")).addFields(
        user.inventory.items.map<Discord.APIEmbedField>((store) => ({
          name: store.item.localName(user.locale),
          value: store.toStateString((key) => bundle.find(user.locale, key)),
          inline: true,
        })),
      ),
    ],
    components: [CloseButtonComponent.Row],
  });
}

export function showUserInfo(interaction: Discord.BaseInteraction, user = User.findUserByInteraction(interaction)) {
  const canvas = Canvass.createCanvas(1000, 1000);
  Canvas.donutProgressBar(canvas, {
    progress: {
      now: user.exp,
      max: user.level ** 2 * 50,
    },
    bar: 100,
    font: {
      font: "bold 150px sans-serif",
      text: `${user.level}Lv`,
    },
    sideFont: {
      font: "bold 125px sans-serif",
      style: "#ffffff",
      text: "",
    },
  });
  const attachment = new AttachmentBuilder(canvas.toBuffer(), {
    name: "profile-image.png",
  });

  return new Manager({
    interaction,
    embeds: [
      new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("User Status Information")
        .setAuthor({
          name: user.user.username,
          iconURL: user.user.displayAvatarURL(),
          url: user.user.displayAvatarURL(),
        })
        .setThumbnail("attachment://profile-image.png")
        .addFields(
          {
            name: "Health",
            value: `${filledBar(user.stats.health_max, Math.max(0, user.stats.health), 10, "\u2593", "\u2588")[0]}\n${
              user.stats.health
            }/${user.stats.health_max}`,
            inline: true,
          },
          {
            name: "Energy",
            value: `${filledBar(user.stats.energy_max, user.stats.energy, 10, "\u2593", "\u2588")[0]}\n${
              user.stats.energy
            }/${user.stats.energy_max}`,
            inline: true,
          },
          { name: "\u200B", value: "\u200B" },
          {
            name: "Money",
            value: `${user.money} ${Bundle.find(user.locale, "unit.money")}`,
            inline: true,
          },
          {
            name: "Equipped Weapon",
            value: user.inventory.equipments.weapon.item.localName(user),
            inline: true,
          },
          {
            name: "Inventory",
            value: user.inventory.items.length.toString(),
            inline: true,
          },
        ),
    ],
    files: [attachment],
    components: [new ActionRowBuilder<ButtonBuilder>().addComponents([WeaponInfoButton, InventoryInfoButton])],
  });
}
