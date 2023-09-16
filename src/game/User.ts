import { InventoryInfoButton, WeaponInfoButton, CloseButtonComponent } from "@/command/components/GeneralComponents";
import Discord, { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, EmbedBuilder } from "discord.js";
import { filledBar } from "string-progressbar";
import { EntityI } from "@/@type/types";
import bundle from "@/assets/Bundle";
import Bundle from "@/assets/Bundle";
import Canvas from "@/utils/Canvas";
import Canvass from "canvas";
import Vars from "@/Vars";

import StatusEffect from "./contents/types/StatusEffect";
import Inventory, { WeaponEntity } from "./Inventory";
import GameManager from "./managers/GameManager";
import StatusEntity from "./StatusEntity";
import Manager from "./managers/Manager";
import Item from "./contents/types/Item";
import Entity from "./Entity";

const defaultStat: Stat = {
  health: 20,
  health_max: 20,
  energy: 100,
  energy_max: 100,
  strength: 0,
  defense: 0,
};

export default class User extends Entity implements EntityI {
  public readonly id: string = "unknown";
  public readonly stats: Stat = defaultStat;
  public readonly inventory: Inventory = new Inventory();
  public name: string = "Unknown User";
  public user: Discord.User;
  public readonly foundContents = { items: [-1], units: [-1] };
  public readonly statuses: StatusEntity[] = [];
  public gameManager?: GameManager | undefined;
  public exp = 0;
  public level = 1;
  public money = 0;
  public locale: string = "en-US";

  constructor(data: Discord.User) {
    super();
    this.user = data;
    this.id = data.id;
    this.name = this.user.username;
  }

  public static findUserByDiscordId(id: string) {
    const user = Vars.userRegistry[id];
    return user;
  }
  public static findUserByInteraction<T extends Discord.BaseInteraction>(interaction: T) {
    const user = Vars.userRegistry[interaction.user.id];
    return user;
  }

  public updateData(interaction: Discord.Interaction) {
    this.user ??= interaction.user;
    this.name ??= this.user?.username;
    this.locale = interaction.locale;
  }

  public applyStatus(status: StatusEffect) {
    const exist = this.statuses.find((s) => s.status === status);
    if (exist) exist.duration += status.duration;
    else this.statuses.push(new StatusEntity(status));
  }

  public removeStatus(status: StatusEffect) {
    const index = this.statuses.findIndex((s) => s.status === status);
    if (index != -1) this.statuses.splice(index, 1);
  }

  public giveItem(item: Item, amount = 1) {
    this.inventory.add(item, amount);

    if (!this.foundContents.items.includes(item.id)) {
      this.foundContents.items.push(item.id);
      this.user.send(bundle.format(this.locale, "firstget", item.localName(this)));
    }
  }

  /**
   * 무기를 교체합니다.
   * @param weapon 바꿀 새 무기
   */
  public switchWeapon(entity: WeaponEntity) {
    super.switchWeapon(entity);
  }

  public async levelup() {
    if (this.exp < this.level ** 2 * 50) return;

    await this.user.send(
      bundle.format(
        this.locale,
        "levelup",
        this.user.username,
        this.level,
        this.level + 1,
        this.stats.health_max,
        (this.stats.health_max += Math.round(this.level ** 0.6 * 5 * 100) / 100),
        this.stats.energy_max,
        (this.stats.energy_max += Math.round(this.level ** 0.4 * 2.5 * 100) / 100),
      ),
    );
    this.stats.health = this.stats.health_max;
    this.stats.energy = this.stats.energy_max;
    this.level++;
  }

  public showInventoryInfo(interaction: Discord.BaseInteraction) {
    return new Manager({
      interaction,
      embeds: [
        new Discord.EmbedBuilder().setTitle(bundle.find(this.locale, "inventory")).addFields(
          this.inventory.items.map<Discord.APIEmbedField>((store) => ({
            name: store.item.localName(this.locale),
            value: store.toStateString((key) => bundle.find(this.locale, key)),
            inline: true,
          })),
        ),
      ],
      components: [CloseButtonComponent.Row],
    });
  }

  public showUserInfo(interaction: Discord.BaseInteraction) {
    const user = User.findUserByInteraction(interaction);
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
}
