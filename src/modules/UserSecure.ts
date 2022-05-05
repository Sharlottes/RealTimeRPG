import Assets from '../assets';
import { Items, ItemStack, UnitEntity } from "../game";
import { Utils } from "../util";
import Discord, { CacheType, MessageAttachment, MessageEmbed, MessageButton, MessageOptions, MessagePayload, TextChannel, Message as DMessage, Base } from 'discord.js';
import { findMessage, save } from '@뇌절봇/game/rpg_';
import { Durable, Inventory, Stat, Message, UserSave } from '@뇌절봇/@type';
import { PagesBuilder } from 'discord.js-pages';
import { filledBar } from 'string-progressbar';
import Canvas from 'canvas';
import { MessageActionRow } from 'discord.js';
import { Item, Weapon } from '@뇌절봇/game/contents';
import { APIMessage } from 'discord-api-types';
import { BaseEmbed } from './BaseEmbed';
import app from '..';

const Bundle = Assets.bundle;
const Database = Utils.Database;

export const defaultStat: Stat = {
  health: 20,
  health_max: 20,
  health_regen: 0.005,
  energy: 100,
  energy_max: 100,
  energy_regen: 1,
  strength: 0,
  defense: 0,
};

export const defaultInven: Inventory = {
  items: [],
  weapon: new ItemStack(5) //주먹 ID
}


export class Status {
  name: string | undefined;
  callback: ((value: number) => void) | undefined;

  constructor(name?: string, callback?: (value: number) => void) {
    this.name = name;
    this.callback = callback;
  }

  public clearSelection() {
    this.name = undefined;
    this.callback = undefined;
  }
}

export class User {
  public money = 0;
  public level = 1;
  public exp = 0;
  public id: string;
  public user: Discord.User;
  public stats: Stat = defaultStat;
  public status: Status = new Status();
  public inventory: Inventory = defaultInven; 
  public enemy: UnitEntity | undefined;
  public selectBuilder?: PagesBuilder;
  public foundContents = {items: [-1], units: [-1]};
  public battleLog = [''];
  public allLog = false;
  public cooldown = 0;
  public countover = 0;

  constructor(user: Discord.User|string) {
    if(typeof user === 'string') {
      this.user = app.client.users.cache.find(u=>u.id === user) as Discord.User;
      this.id = user;
    }
    else {
      this.user = user;
      this.id = user.id;
    }
  }


  public getLocale(msg = findMessage(this)) {
    return msg?.interaction.locale;
  }

  public edit(options: string | MessagePayload | MessageOptions, channel?: TextChannel) {
    const msg = findMessage(this);
    if(channel) channel.messages.cache.find(msg=> msg.embeds.length > 0 && msg.author.bot)?.edit(options);
    else msg?.interaction.editReply(options);
  }

  public init() {
		if(!this.foundContents.items) this.foundContents.items = this.inventory.items.map((i) => i.id);
		if(!this.foundContents.units) this.foundContents.units = [];
    this.status = new Status();
  }

  public update() {
		if(this.cooldown > 0) this.cooldown -= 1 / 100;

		this.stats.energy = Math.min(this.stats.energy_max, this.stats.energy + this.stats.energy_regen / 100);
		this.stats.health = Math.min(this.stats.health_max, this.stats.health + this.stats.health_regen / 100);
  }

  public static with(data: UserSave) {
    const user = new User(data.id);
    user.read(data);
    return user;
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
    this.inventory = data.inventory;
    this.foundContents = data.fountContents;
  }
  
  public giveItem(item: Item, amount = 1): string | null {
    const exist = this.inventory.items.find((i) => ItemStack.equals(i, item));
    if (exist) exist.amount += amount;
    else this.inventory.items.push(new ItemStack(item.id, amount, (item as unknown as Durable).durability));

    if (!this.foundContents.items.includes(item.id)) {
      this.foundContents.items.push(item.id);
      return Bundle.format(this.getLocale(), 'firstget', item.localName(this));
    }

    return null;
  }

  /**
   * 기존 무기를 새 무기로 전환
   * @param weapon 장착할 새 무기
   * @returns {string} 변경 메시지
   */
  public switchWeapon(weapon: Weapon) {
    const entity = this.inventory.items.find((entity) => ItemStack.getItem(entity) == weapon);
    const locale = this.getLocale();

    if (!entity) return Bundle.format(locale, 'switch_notHave', weapon.localName(this));
    entity.amount--;
    if (!entity.amount) this.inventory.items.splice(this.inventory.items.indexOf(entity), 1);

    this.giveItem(weapon);
    this.inventory.weapon.id = weapon.id;
    this.inventory.weapon.durability = weapon.durability;
    
    return Bundle.format(locale, 'switch_change', weapon.localName(this), Items.find(entity.id).localName(this));
  }

  public levelup() {
    const str = Bundle.format(
      this.getLocale(),
      'levelup',
      this.user.username,
      this.level,
      this.level + 1,
      this.stats.health_max,
      Math.round((this.stats.health_max += this.level ** 0.6 * 5) * 100) / 100,
      this.stats.energy_max,
      Math.round((this.stats.energy_max += this.level ** 0.4 * 2.5) * 100) / 100,
    );
    findMessage(this)?.interaction.followUp(str);
    this.stats.health = this.stats.health_max;
    this.stats.energy = this.stats.energy_max;
    this.level++;
    save();
  }

  public getInventoryInfo(msg: Message) {
    let embed = new MessageEmbed().setTitle(Bundle.find(this.getLocale(msg), 'inventory'));
    this.inventory.items.forEach(stack => {
      if(stack.amount <= 0) return; 
      const type = ItemStack.getItem(stack);
      if(!type) return; 
      embed = embed.addField(type.localName(this), `${stack.amount} ${Bundle.find(this.getLocale(msg), 'unit.item')}`, true);
    });
    return new BaseEmbed(msg.interaction).setPages(embed);
  }

  public getUserInfo(msg: Message) {
    const user = msg.interaction.user;

    const canvas = Canvas.createCanvas(1000, 1000);
    Utils.Canvas.donutProgressBar(canvas, {
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
    const weapon: Weapon = ItemStack.getItem(this.inventory.weapon);
    const statusEmbed = new MessageEmbed()
      .setColor('#0099ff')
      .setTitle('User Status Information')
      .setAuthor({name: user.username, iconURL: user.displayAvatarURL(), url: user.displayAvatarURL()})
      .setThumbnail("attachment://profile-image.png")
      .addFields(
        { name: "Health", value: `${filledBar(this.stats.health_max, this.stats.health, 10, "\u2593", "\u2588")[0]}\n${this.stats.health.toFixed(2)}/${this.stats.health_max}    (${this.stats.health_regen}/s)`, inline: true},
        { name: "Energy", value: `${filledBar(this.stats.energy_max, this.stats.energy, 10, "\u2593", "\u2588")[0]}\n${this.stats.energy.toFixed(2)}/${this.stats.energy_max}    (${this.stats.energy_regen}/s)`, inline: true},
        { name: '\u200B', value: '\u200B'},
        { name: 'Equipped Weapon', value: weapon.localName(this), inline: true },
        { name: 'Current Money', value: this.money+'$', inline: true },
        { name: 'Inventory', value: this.inventory.items.length+'/50', inline: true }
      );

    const builder = new BaseEmbed(msg.interaction);
    builder.setPages(statusEmbed);
    builder
      .setDescription('\u200B')
      .addComponents(new MessageActionRow().addComponents([
        new MessageButton().setCustomId('weapon_info').setLabel('get Weapon Info').setStyle('PRIMARY'), 
        new MessageButton().setCustomId('inventory_info').setLabel('get Inventory Info').setStyle('PRIMARY')
      ])).addTriggers([{
        name: 'weapon_info',
        callback: (inter, cos) => {
          cos.setDisabled(true);
          const weaponEmbed = new MessageEmbed()
            .setColor('#b8b8b8')
            .setTitle(`Weapon: \`${weapon.localName(this)}\` Information`)
            .setAuthor({name: user.username, iconURL: user.displayAvatarURL(), url: user.displayAvatarURL()})
            .addFields(        
              { name: 'critical', value: `${(weapon.critical_ratio * 100).toFixed(2)}% damages in ${(weapon.critical_chance * 100).toFixed(2)} chance`},
              { name: 'damage', value: weapon.damage+'', inline: true},
              { name: 'cooldown', value: weapon.cooldown+'', inline: true},
              { name: 'durability', value: `${filledBar(weapon.durability||0, this.inventory.weapon.durability||0, 10, "\u2593", "\u2588")[0]}\n${Bundle.find(this.getLocale(msg), 'durability')}: ${this.inventory.weapon.durability||0}/${weapon.durability||0}`, inline: true},
            )
          new BaseEmbed(msg.interaction).setPages(weaponEmbed).build();
        }
      },{
        name: 'inventory_info',
        callback: (inter, cos) => {
          cos.setDisabled(true);
          this.getInventoryInfo(msg).build();
        }
      }])
    builder.addFiles(attachment)
    msg.interaction.editReply({files: [attachment]});
    return builder;
  }
}
/*

function login(users: User[], target: User, msg: Message, lang: Assets.bundle.language) {
  const hash = msg.interaction.user.id;
  const others = users.filter((u) => u !== target && u.hash == Number(hash));
  if (others.length) {
    users = users.map((u) => {
      if (u == target || u.hash !== Number(hash)) return u;
      u.hash = 0;
      return u;
    });
    return Bundle.find(lang, "account.auto_logout");
  }
  target.hash = Number(hash);
  Database.writeObject("./Database/user_data", users);
  return Bundle.find(lang, "account.login_success");
}

export function create(msg: Message, users: User[], lang: Assets.bundle.language = "en") {
  const hash = msg.interaction.user.id;
  const id = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('id', true).replace(/[@]/g, "");
  const pw = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('pw', true);
  const user = users.find((u) => u.id == id);

  if (user) return Bundle.format(lang, "account.account_exist", id);
  else {
    const target = new User({id: id, password: pw, hash: hash});
    users.push(target);
    login(users, target, msg, lang);
    return Bundle.find(lang, "account.create_success");
  }
}

export function remove(msg: Message, users: User[], lang: Assets.bundle.language = "en") {
  const hash = msg.interaction.user.id;
  const id = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('id', true).replace(/[@]/g, "");
  const pw = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('pw', true);
  const user = users.find((u) => u.id == id);
  
  if (!user) return Bundle.find(lang, "account.account_notFound");
  else if (user.password !== pw)
    return Bundle.find(lang, "account.account_incorrect");
  else if (user.hash !== Number(hash))
    return Bundle.find(lang, "account.account_notLogin");
  else {
    users.splice(users.indexOf(user), 1);
    Database.writeObject("./Database/user_data", users);
    return Bundle.find(lang, "account.remove_success");
  }
}

export function signin(msg: Message, users: User[], lang: Assets.bundle.language = "en") {
  const hash = msg.interaction.user.id;
  const id = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('id', true).replace(/[@]/g, "");
  const pw = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('pw', true);
  const user = users.find((u) => u.id == id);

  if (!user) return Bundle.find(lang, "account.account_notFound");
  else if (user.password !== pw) 
    return Bundle.find(lang, "account.account_incorrect");
  else if (user.hash)
    return 
      user.hash == Number(hash)
        ? Bundle.find(lang, "account.account_have")
        : Bundle.find(lang, "account.account_has")
    );
  else login(users, user, msg, lang);
}

export function signout(msg: Message, users: User[], lang: Assets.bundle.language = "en") {
  const hash = msg.interaction.user.id;
  const user = users.find((u) => u.hash == Number(hash));

  if (!user) return Bundle.find(lang, "account.account_notLogin"));
  else {
    user.hash = 0;
    return Bundle.find(lang, "account.logout_success");
    Database.writeObject("user_data", users);
  }
}

export function change(msg: Message, users: User[], lang: Assets.bundle.language = "en") {
  const type = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('type', true);
  const id = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('id', true).replace(/[@]/g, "");
  const pw = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('pw', true);
  const changeto = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('target', true);
  const user = users.find((u) => u.id == id);
  
  if (!user) return Bundle.find(lang, "account.account_notFound");
  {
    switch(type.toLowerCase()) {
      case 'pw': {
        if(users.find(u => u.id === changeto)) {
          return Bundle.format(lang, "account.account_exist", id);
        } else {
          user.id = changeto;
          return Bundle.format(lang, "account.change_id", user.id, changeto);
        }
      } 
    }
  }
  else if (type.toLowerCase() == "pw") {
    if (users.find((u) => u.id == changeto))
      return Bundle.format(lang, "account.account_exist", id);
    else {
      user.id = changeto;
      return Bundle.format(lang, "account.change_id", user.id, changeto);
    }
  } else if (type.toLowerCase() == "id") {
    user.password = changeto;
    return Bundle.format(lang, "account.change_pw", user.id, changeto);
  }

  Database.writeObject("./Database/user_data", users);
}
/*
export function setLang(msg: Message, users: User[], lang: Assets.bundle.language = "en") {
  const hash = msg.interaction.user.id;
  const langto: Assets.bundle.language = msg.content.split(/\s/)[1] as Assets.bundle.language;
  const user = users.find((u) => user.hash == Number(hash));

  if (!user) return return Bundle.find(lang, "account.account_notLogin"));
  else {
    user.lang = langto;
    return Bundle.format(lang, "account.lang_success", lang, langto));
    Database.writeObject("./Database/user_data", users);
  }
};
*/

