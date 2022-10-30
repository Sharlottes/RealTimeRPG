
import Discord, { AttachmentBuilder, EmbedBuilder, MessagePayload, ChatInputCommandInteraction, ActionRowBuilder, ButtonBuilder, BaseMessageOptions, ButtonStyle } from 'discord.js';

import Canvass from 'canvas';

import { Item, Items, StatusEffect } from 'game/contents';
import { EntityI, Stat, UserSave } from '@type';
import { ItemStack, StatusEntity, Inventory, WeaponEntity } from "game";
import { bundle } from 'assets';
import { Canvas } from "utils";
import { app } from 'index';
import { filledBar } from 'string-progressbar';
import Entity from './Entity';
import { SlotWeaponEntity } from './Inventory';
import Manager from './managers/Manager';
import GameManager from './managers/GameManager';
import { predicateOf } from 'utils/predicateOf';

const defaultStat: Stat = {
  health: 20,
  health_max: 20,
  energy: 100,
  energy_max: 100,
  strength: 0,
  defense: 0,
};

export default class User extends Entity implements EntityI {
  public readonly id: string = 'unknown';
  public readonly stats: Stat = defaultStat;
  public readonly inventory: Inventory = new Inventory();
  public name: string = 'Unknown User';
  public user: Discord.User; /*should be non-null*/
  public readonly foundContents = { items: [-1], units: [-1] };
  public readonly statuses: StatusEntity[] = [];
  public readonly gameManager: GameManager = new GameManager(this);
  public exp = 0;
  public level = 1;
  public money = 0;
  public locale: string = bundle.defaultLocale;

  constructor(data: Discord.User | UserSave | string) {
    super()
    if (typeof data === 'string') {
      this.user = app.client.users.cache.find(u => u.id === data) as Discord.User;
      this.id = data;
      this.name = this.user?.username;
    }
    else if (data instanceof Discord.User) {
      this.user = data;
      this.id = data.id;
      this.name = this.user.username;
    } else {
      this.user = app.client.users.cache.find(u => u.id === data.id) as Discord.User;
      this.name = this.user?.username;
      this.id = data.id;
      this.money = Math.round(data.money);
      this.level = data.level;
      this.exp = data.exp;
      this.stats = data.stats;
      this.inventory.fromJSON(data.inventory);
      this.foundContents = data.fountContents;
    }
  }

  public updateData(interaction: ChatInputCommandInteraction) {
    this.user ??= interaction.user;
    this.name ??= this.user?.username;
    this.locale = interaction.locale;
  };

  public applyStatus(status: StatusEffect) {
    const exist = this.statuses.find(s => s.status === status);
    if (exist) exist.duration += status.duration;
    else this.statuses.push(new StatusEntity(status));
  }

  public removeStatus(status: StatusEffect) {
    const index = this.statuses.findIndex(s => s.status === status);
    if (index != -1) this.statuses.splice(index, 1);
  }

  public save(): UserSave {
    return {
      id: this.id,
      money: Math.round(this.money),
      level: this.level,
      exp: this.exp,
      stats: this.stats,
      inventory: this.inventory.toJSON(),
      fountContents: this.foundContents
    }
  }

  public giveItem(item: Item, amount = 1) {
    this.inventory.add(item, amount);

    if (!this.foundContents.items.includes(item.id)) {
      this.foundContents.items.push(item.id);
      this.user.send(bundle.format(this.locale, 'firstget', item.localName(this)));
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
    await this.user.send(bundle.format(
      this.locale,
      'levelup',
      this.user.username,
      this.level,
      this.level + 1,
      this.stats.health_max,
      this.stats.health_max += Math.round((this.level ** 0.6 * 5) * 100) / 100,
      this.stats.energy_max,
      this.stats.energy_max += Math.round((this.level ** 0.4 * 2.5) * 100) / 100,
    ));
    this.stats.health = this.stats.health_max;
    this.stats.energy = this.stats.energy_max;
    this.level++;
  }

  public async showInventoryInfo(interaction: ChatInputCommandInteraction) {
    const find = (key: string) =>
      bundle.find(this.locale, key);
    const manager = new Manager({
      interaction: interaction,
      embeds: [
        new EmbedBuilder()
          .setTitle(bundle.find(this.locale, 'inventory'))
          .addFields(
            this.inventory.items.map<Discord.APIEmbedField>(store => ({
              name: store.item.localName(this.locale),
              value: store.toStateString(find),
              inline: true
            }))
          )
      ]
    })
    await manager.update();
  }

  public async showUserInfo(interaction: ChatInputCommandInteraction) {
    const weapon = this.inventory.equipments.weapon.item;
    const canvas = Canvass.createCanvas(1000, 1000);
    Canvas.donutProgressBar(canvas, {
      progress: {
        now: this.exp,
        max: this.level ** 2 * 50
      },
      bar: 100,
      font: {
        font: "bold 150px sans-serif",
        text: `${this.level}Lv`,
      },
      sideFont: {
        font: "bold 125px sans-serif",
        style: '#ffffff',
        text: ""
      }
    });
    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'profile-image.png' });

    const manager = new Manager({
      interaction: interaction,
      embeds: [new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('User Status Information')
        .setAuthor({ name: this.user.username, iconURL: this.user.displayAvatarURL(), url: this.user.displayAvatarURL() })
        .setThumbnail("attachment://profile-image.png")
        .addFields(
          { name: "Health", value: `${filledBar(this.stats.health_max, Math.max(0, this.stats.health), 10, "\u2593", "\u2588")[0]}\n${this.stats.health}/${this.stats.health_max}`, inline: true },
          { name: "Energy", value: `${filledBar(this.stats.energy_max, this.stats.energy, 10, "\u2593", "\u2588")[0]}\n${this.stats.energy}/${this.stats.energy_max}`, inline: true },
          { name: '\u200B', value: '\u200B' },
          { name: 'Money', value: `${this.money} ${bundle.find(this.locale, 'unit.money')}`, inline: true },
          { name: 'Equipped Weapon', value: weapon.localName(this), inline: true },
          { name: 'Inventory', value: this.inventory.items.length.toString(), inline: true }
        )]
    })
    manager.files.push(attachment)
    manager.components.push(
      new ActionRowBuilder<ButtonBuilder>()
        .addComponents([
          new ButtonBuilder()
            .setCustomId('weapon_info')
            .setLabel('show Weapon Info')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId('inventory_info')
            .setLabel('show Inventory Info')
            .setStyle(ButtonStyle.Primary)
        ])
    )
    manager.triggers.set('weapon_info', () => weapon.showInfo(interaction, this.inventory.equipments.weapon))
    manager.triggers.set('inventory_info', () => this.showInventoryInfo(interaction))
    await manager.update();
  }
}