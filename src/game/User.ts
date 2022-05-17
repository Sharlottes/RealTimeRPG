
import Discord, { MessageAttachment, MessageEmbed, MessageButton, MessageActionRow, MessagePayload, MessageOptions, CommandInteraction } from 'discord.js';

import { filledBar } from 'string-progressbar';
import Canvass from 'canvas';

import { Items, Item, Weapon, StatusEffect } from '@RTTRPG/game/contents';
import { EntityI, Inventory, Stat, UserSave } from '@RTTRPG/@type';
import { save, ItemStack, StatusEntity } from "@RTTRPG/game";
import { BaseEmbed } from '@RTTRPG/modules';
import { bundle } from '@RTTRPG/assets';
import { Canvas } from "@RTTRPG/util";
import app from '@RTTRPG/index';

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
  public exp = 0;
  public level = 1;
  public money = 0;
  public name: string;
  public id: string;
  public locale: string = bundle.defaultLocale;
  public user: Discord.User;
  public stats: Stat = defaultStat;
  public inventory: Inventory = { items: [], weapon: new ItemStack(5) };
  public foundContents = { items: [-1], units: [-1] };
  public statuses: StatusEntity[];

  constructor(user: Discord.User|string) {
    if(typeof user === 'string') {
      this.user = app.client.users.cache.find(u=>u.id === user) as Discord.User;
      this.id = user;
      this.name = this.user?.username;
    }
    else {
      this.user = user;
      this.id = user.id;
      this.name = this.user.username;
    }
    
    this.statuses = [];
  }

  public static with(data: UserSave): User {
    const user = new User(data.id);
    user.read(data);
    return user;
  }

  public applyStatus(status: StatusEffect) {
    const exist = this.statuses.find(s => s.status.id == status.id);
    if(exist) exist.duration += status.duration;
    else this.statuses.push(new StatusEntity(status)); 
  }

  public removeStatus(status: StatusEffect) {
    this.statuses.splice(this.statuses.findIndex(entity=>entity.status.id==status.id), 1);
  }

  public update() {
		if(this.inventory.weapon.items[0]?.cooldown && this.inventory.weapon.items[0].cooldown > 0) this.inventory.weapon.items[0].cooldown -= 1 / 100;

		this.stats.energy = Math.min(this.stats.energy_max, this.stats.energy + this.stats.energy_regen / 100);
		this.stats.health = Math.min(this.stats.health_max, this.stats.health + this.stats.health_regen / 100);
  }

  public save(): UserSave {
    return {
      id: this.id,
      money: this.money,
      level: this.level,
      exp: this.exp,
      stats: this.stats,
      inventory: this.inventory,
      fountContents: this.foundContents 
    }
  }

  public read(data: UserSave) {
    this.id = data.id;
    this.money = data.money;
    this.level = data.level;
    this.exp = data.exp;
    this.stats = data.stats;
    this.inventory = {
      items: data.inventory.items.map(stack=>new ItemStack(stack.id, stack.amount, stack.items)),
      weapon: new ItemStack(data.inventory.weapon.id, data.inventory.weapon.amount, data.inventory.weapon.items)
    };
    this.foundContents = data.fountContents;
  }
  
  public giveItem(item: Item, amount = 1) {
    const exist = this.inventory.items.find((i) => i.id == item.id);
    if (exist) exist.add(amount);
    else this.inventory.items.push(new ItemStack(item.id, amount));

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
  
  public switchWeapon(weapon: Weapon, targetEntity: ItemStack) {
    const entity = this.inventory.items.find((entity) => entity.id == weapon.id);
    const locale = this.locale;

    if (!entity) return bundle.format(locale, 'missing_item', weapon.localName(this));

    targetEntity.remove();
    if (targetEntity.amount <= 0) this.inventory.items.splice(this.inventory.items.indexOf(entity), 1);

    this.giveItem(this.inventory.weapon.getItem());
    this.inventory.weapon = new ItemStack(weapon.id);
  }

  public levelup() {
    this.sendDM(bundle.format(
      this.locale,
      'levelup',
      this.user.username,
      this.level,
      this.level + 1,
      this.stats.health_max,
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
    let embed = new MessageEmbed().setTitle(bundle.find(this.locale, 'inventory'));
    this.inventory.items.forEach(stack => {
      if(stack.amount <= 0) return;
      embed = embed.addField(stack.getItem().localName(this), `${stack.amount} ${bundle.find(this.locale, 'unit.item')}`, true);
    });
    return new BaseEmbed(interaction).setPages(embed);
  }

  public getUserInfo(interaction: CommandInteraction) {
    const user = interaction.user;
    const weapon = this.inventory.weapon.getItem<Weapon>();
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