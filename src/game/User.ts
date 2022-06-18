
import Discord, { MessageAttachment, MessageEmbed, MessagePayload, CommandInteraction, MessageActionRow, MessageButton, MessageOptions } from 'discord.js';

import Canvass from 'canvas';

import { Item, Weapon, StatusEffect } from '@RTTRPG/game/contents';
import { EntityI, Stat, UserSave } from '@RTTRPG/@type';
import { save, ItemStack, StatusEntity, Inventory, WeaponEntity } from "@RTTRPG/game";
import { bundle } from '@RTTRPG/assets';
import { Canvas } from "@RTTRPG/util";
import { app } from '@RTTRPG/index';
import { BaseEmbed } from '@RTTRPG/modules';
import { filledBar } from 'string-progressbar';
import { SlotWeaponEntity } from './Inventory';

const defaultStat: Stat = {
  health: 20,
  health_max: 20,
  health_regen: 0.005,
  energy: 100,
  energy_max: 100,
  energy_regen: 1,
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
  public exp = 0;
  public level = 1;
  public money = 0;
  public locale: string = bundle.defaultLocale;

  constructor(data: Discord.User|UserSave|string) {
    if(typeof data === 'string') {
      this.user = app.client.users.cache.find(u=>u.id === data) as Discord.User;
      this.id = data;
      this.name = this.user?.username;
    }
    else if(data instanceof Discord.User) {
      this.user = data;
      this.id = data.id;
      this.name = this.user.username;
    }
    else {
      this.user = app.client.users.cache.find(u=>u.id === data.id) as Discord.User;
      this.name = this.user?.username;
      this.id = data.id;
      this.money = data.money;
      this.level = data.level;
      this.exp = data.exp;
      this.stats = data.stats;
      this.inventory.fromJSON(data.inventory);
      this.foundContents = data.fountContents;
    }
  }

  public applyStatus(status: StatusEffect) {
    const exist = this.statuses.find(s => s.status.id == status.id);
    if(exist) exist.duration += status.duration;
    else this.statuses.push(new StatusEntity(status)); 
  }

  public removeStatus(status: StatusEffect) {
   }

  public save(): UserSave {
    return {
      id: this.id,
      money: this.money,
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
    
    save();
  }

  public sendDM(options: string | MessagePayload | MessageOptions): Promise<Discord.Message> | undefined {
    if(!this.user.dmChannel) this.user.createDM();
    return this.user.dmChannel?.send(options);
  }
  
  public switchWeapon(weapon: Weapon) {
    const entity = this.inventory.items.find<WeaponEntity>((store): store is WeaponEntity => store instanceof WeaponEntity && store.item == weapon);
    if (!entity) return bundle.format(this.locale, 'missing_item', weapon.localName(this));
    this.inventory.items.push(this.inventory.equipments.weapon);
    this.inventory.items.splice(this.inventory.items.indexOf(entity), 1);
    this.inventory.equipments.weapon = entity ;
  }

  public levelup() {
    this.sendDM(bundle.format(
      this.locale,
      'levelup',
      this.user.username,
      this.level,
      this.level + 1,
      Math.round((this.stats.health_max += this.level ** 0.6 * 5) * 100) / 100,
      this.stats.energy_max,
      Math.round((this.stats.energy_max += this.level ** 0.4 * 2.5) * 100) / 100,
    ));
    this.stats.health = this.stats.health_max;
    this.stats.energy = this.stats.energy_max;
    this.level++;
    save();
  }

  public getInventoryInfo(interaction: CommandInteraction) {
    const embed = new MessageEmbed().setTitle(bundle.find(this.locale, 'inventory'))
      .addFields(this.inventory.items.map<Discord.EmbedFieldData>(store => ({
        name: store.item.localName(this.locale), 
        value: store instanceof ItemStack ? 
          `${store.amount} ${bundle.find(this.locale, 'unit.item')}` : 
          store instanceof WeaponEntity ? 
              `${store.cooldown} ${bundle.find(this.locale, 'cooldown')}, ${store.durability} ${bundle.find(this.locale, 'durability')}` + 
                (store instanceof SlotWeaponEntity ? `${store.ammos.length} ${bundle.find(this.locale, 'unit.item')} ${bundle.find(this.locale, 'ammo')}` : "") : 
            "",
        inline: true
      })));
      
    return new BaseEmbed(interaction).setPages(embed);
  }

  public getUserInfo(interaction: CommandInteraction) {
    const user = interaction.user;
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
    const attachment = new MessageAttachment(canvas.toBuffer(), 'profile-image.png');

    return new BaseEmbed(interaction)
      .setColor('#0099ff')
      .setTitle('User Status Information')
      .setAuthor({name: user.username, iconURL: user.displayAvatarURL(), url: user.displayAvatarURL()})
      .setThumbnail("attachment://profile-image.png")
      .addFiles(attachment)
      .addFields(
        { name: "Health", value: `${filledBar(this.stats.health_max, Math.max(0,this.stats.health), 10, "\u2593", "\u2588")[0]}\n${this.stats.health.toFixed(2)}/${this.stats.health_max}    (${this.stats.health_regen}/s)`, inline: true},
        { name: "Energy", value: `${filledBar(this.stats.energy_max, this.stats.energy, 10, "\u2593", "\u2588")[0]}\n${this.stats.energy.toFixed(2)}/${this.stats.energy_max}    (${this.stats.energy_regen}/s)`, inline: true},
        { name: '\u200B', value: '\u200B'},
        { name: 'Equipped Weapon', value: weapon.localName(this), inline: true },
        { name: 'Current Money', value: this.money+'$', inline: true },
        { name: 'Inventory', value: this.inventory.items.length+'/50', inline: true }
      )
      .addComponents(new MessageActionRow().addComponents([
        new MessageButton().setCustomId('weapon_info').setLabel('get Weapon Info').setStyle('PRIMARY'), 
        new MessageButton().setCustomId('inventory_info').setLabel('get Inventory Info').setStyle('PRIMARY')
      ]))
      .addTriggers([
        {
          name: 'weapon_info',
          callback: (inter, button) => {
            button.setDisabled(true);

            new BaseEmbed(interaction)           
              .setColor('#b8b8b8')
              .setTitle(`Weapon: \`${weapon.localName(this)}\` Information`)
              .setAuthor({name: user.username, iconURL: user.displayAvatarURL(), url: user.displayAvatarURL()})
              .addFields(        
                { name: 'critical', value: `${(weapon.critical_ratio * 100).toFixed(2)}% damages in ${(weapon.critical_chance * 100).toFixed(2)} chance`},
                { name: 'damage', value: weapon.damage.toString(), inline: true},
                { name: 'cooldown', value: weapon.cooldown.toString(), inline: true},
              )
              .build();
          }
        },
        {
          name: 'inventory_info',
          callback: (inter, button) => {
            button.setDisabled(true);

            this.getInventoryInfo(interaction).build();
          }
        }
      ]);
  }
}