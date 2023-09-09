import Discord, { AttachmentBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { filledBar } from "string-progressbar";
import { EntityI } from "@/@type/types";
import bundle from "@/assets/Bundle";
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
import Alert from "./Alert";

const defaultStat: Stat = {
  health: 20,
  health_max: 20,
  energy: 100,
  energy_max: 100,
  strength: 0,
  defense: 0,
};

export interface UserEvents {
  alert: [Alert];
}

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
  public readonly alerts: Alert[] = [];
  public readonly events: Map<
    keyof UserEvents,
    Array<(...args: UserEvents[keyof UserEvents]) => Discord.Awaitable<void>>
  > = new Map<keyof UserEvents, Array<(...args: UserEvents[keyof UserEvents]) => Discord.Awaitable<void>>>();

  constructor(data: Discord.User) {
    super();
    this.user = data;
    this.id = data.id;
    this.name = this.user.username;
  }

  public static findUserByDiscordId(id: string) {
    const user = Vars.users.find((user) => user.id == id);
    return user;
  }
  public static findUserByInteraction<T extends Discord.BaseInteraction>(interaction: T) {
    const user = Vars.users.find((user) => user.id == interaction.user.id);
    return user;
  }

  public on<K extends keyof UserEvents>(event: K, listener: (...args: UserEvents[K]) => Discord.Awaitable<void>): this {
    this.events.set(event, (this.events.get(event) ?? []).concat([listener]));
    return this;
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

  public async addAlert(alert: Alert) {
    this.alerts.push(alert);
    const listeners = this.events.get("alert");
    if (!listeners) return;
    for await (const listener of listeners) {
      await listener(alert);
    }
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

  public showInventoryInfo(interaction: Discord.CommandInteraction) {
    return new Manager({ interaction })
      .setEmbeds(
        new Discord.EmbedBuilder().setTitle(bundle.find(this.locale, "inventory")).addFields(
          this.inventory.items.map<Discord.APIEmbedField>((store) => ({
            name: store.item.localName(this.locale),
            value: store.toStateString((key) => bundle.find(this.locale, key)),
            inline: true,
          })),
        ),
      )
      .addRemoveButton(-1);
  }

  public showUserInfo(interaction: Discord.CommandInteraction) {
    const weapon = this.inventory.equipments.weapon.item;
    const canvas = Canvass.createCanvas(1000, 1000);
    Canvas.donutProgressBar(canvas, {
      progress: {
        now: this.exp,
        max: this.level ** 2 * 50,
      },
      bar: 100,
      font: {
        font: "bold 150px sans-serif",
        text: `${this.level}Lv`,
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

    return new Manager({ interaction })
      .setEmbeds(
        new EmbedBuilder()
          .setColor("#0099ff")
          .setTitle("User Status Information")
          .setAuthor({
            name: this.user.username,
            iconURL: this.user.displayAvatarURL(),
            url: this.user.displayAvatarURL(),
          })
          .setThumbnail("attachment://profile-image.png")
          .addFields(
            {
              name: "Health",
              value: `${filledBar(this.stats.health_max, Math.max(0, this.stats.health), 10, "\u2593", "\u2588")[0]}\n${
                this.stats.health
              }/${this.stats.health_max}`,
              inline: true,
            },
            {
              name: "Energy",
              value: `${filledBar(this.stats.energy_max, this.stats.energy, 10, "\u2593", "\u2588")[0]}\n${
                this.stats.energy
              }/${this.stats.energy_max}`,
              inline: true,
            },
            { name: "\u200B", value: "\u200B" },
            {
              name: "Money",
              value: `${this.money} ${bundle.find(this.locale, "unit.money")}`,
              inline: true,
            },
            {
              name: "Equipped Weapon",
              value: weapon.localName(this),
              inline: true,
            },
            {
              name: "Inventory",
              value: this.inventory.items.length.toString(),
              inline: true,
            },
          ),
      )
      .setFiles(attachment)
      .setComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents([
          new ButtonBuilder().setCustomId("weapon_info").setLabel("show Weapon Info").setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("inventory_info")
            .setLabel("show Inventory Info")
            .setStyle(ButtonStyle.Primary),
        ]),
      )
      .setTrigger("weapon_info", async () => await weapon.showInfo(interaction, this.inventory.equipments.weapon))
      .setTrigger("inventory_info", async () => await this.showInventoryInfo(interaction).send())
      .addRemoveButton(-1);
  }
}
