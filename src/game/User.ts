
import Discord, { AttachmentBuilder, EmbedBuilder, MessagePayload, CommandInteraction, ActionRowBuilder, ButtonBuilder, BaseMessageOptions, ButtonStyle } from 'discord.js';

import Canvass from 'canvas';

import { Item, Items, StatusEffect } from 'game/contents';
import { EntityI, Stat, UserSave } from '@type';
import { ItemStack, StatusEntity, Inventory, WeaponEntity } from "game";
import { bundle } from 'assets';
import { Canvas } from "utils";
import { app } from 'index';
import { filledBar } from 'string-progressbar';
import { SlotWeaponEntity } from './Inventory';
import Manager from './managers/Manager';
import GameManager from './managers/GameManager';

const defaultStat: Stat = {
  health: 20,
  health_max: 20,
  energy: 100,
  energy_max: 100,
  strength: 0,
  defense: 0,
};

export default class User implements EntityI {
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

  public updateData(interaction: CommandInteraction) {
    this.user ??= interaction.user;
    this.name ??= this.user?.username;
    this.locale = interaction.locale;
  };

  public applyStatus(status: StatusEffect) {
    const exist = this.statuses.find(s => s.status.id == status.id);
    if (exist) exist.duration += status.duration;
    else this.statuses.push(new StatusEntity(status));
  }

  public removeStatus(status: StatusEffect) {
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
      this.sendDM(bundle.format(this.locale, 'firstget', item.localName(this)));
    }
  }

  public sendDM(options: string | MessagePayload | BaseMessageOptions): Promise<Discord.Message> | undefined {
    if (!this.user.dmChannel) this.user.createDM();
    return this.user.dmChannel?.send(options);
  }

  public switchWeapon(weapon: Item) {
    const entity = weapon == Items.punch ? new WeaponEntity(weapon) : this.inventory.items.find<WeaponEntity>((store): store is WeaponEntity => store instanceof WeaponEntity && store.item == weapon);
    if (!entity) return bundle.format(this.locale, 'missing_item', weapon.localName(this));
    if (this.inventory.equipments.weapon.item != Items.none && this.inventory.equipments.weapon.item != Items.punch) this.inventory.items.push(this.inventory.equipments.weapon);
    this.inventory.items.splice(this.inventory.items.indexOf(entity), 1);
    this.inventory.equipments.weapon = entity;
  }

  public async levelup() {
    await this.sendDM(bundle.format(
      this.locale,
      'levelup',
      this.user.username,
      this.level,
      this.level + 1,
      this.stats.health_max += Math.round((this.level ** 0.6 * 5) * 100) / 100,
      this.stats.energy_max,
      this.stats.energy_max += Math.round((this.level ** 0.4 * 2.5) * 100) / 100,
    ));
    this.stats.health = this.stats.health_max;
    this.stats.energy = this.stats.energy_max;
    this.level++;
  }

  public async showInventoryInfo(interaction: CommandInteraction) {
    await new Manager({
      interaction: interaction,
      embeds: [new EmbedBuilder()
        .setTitle(bundle.find(this.locale, 'inventory'))
        .addFields(this.inventory.items.map<Discord.APIEmbedField>(store => ({
          name: store.item.localName(this.locale),
          value: store instanceof ItemStack ? `${store.amount} ${bundle.find(this.locale, 'unit.item')}` :
            store instanceof WeaponEntity ? `${store.cooldown} ${bundle.find(this.locale, 'cooldown')}, ${store.durability} ${bundle.find(this.locale, 'durability')}` +
              (store instanceof SlotWeaponEntity ? `${store.ammos.length} ${bundle.find(this.locale, 'unit.item')} ${bundle.find(this.locale, 'ammo')}` : "") : "",
          inline: true
        })))]
    }).update();
  }

  public async showUserInfo(interaction: CommandInteraction) {
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

    await new Manager({ 
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
      .apply(manager => {
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
      })
      .update();
  }
}