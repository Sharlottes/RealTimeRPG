import Assets from '../assets';
import { Items, ItemStack, UnitEntity } from "../game";
import { Utils } from "../util";
import Discord, { CacheType, MessageAttachment, MessageEmbed, MessageButton } from 'discord.js';
import { findMessage, save } from '@뇌절봇/game/rpg_';
import { Durable, Inventory, Stat, Message } from '@뇌절봇/@type';
import { PagesBuilder } from 'discord.js-pages';
import { filledBar } from 'string-progressbar';
import Canvas from 'canvas';
import { MessageActionRow } from 'discord.js';
import { Item, Weapon } from '@뇌절봇/game/contents';

const Bundle = Assets.bundle;
const Database = Utils.Database;

function login(users: User[], target: User, msg: Message, lang: Assets.bundle.language) {
  const hash = msg.interaction.user.id;
  const others = users.filter((u) => u !== target && u.hash == Number(hash));
  if (others.length) {
    users = users.map((u) => {
      if (u == target || u.hash !== Number(hash)) return u;
      u.hash = 0;
      return u;
    });
    msg.interaction.followUp(Bundle.find(lang, "account.auto_logout"));
  }
  target.hash = Number(hash);
  Database.writeObject("./Database/user_data", users);
  msg.interaction.followUp(Bundle.find(lang, "account.login_success"));
}

export const defaultStat: Stat = {
  health: 20,
  health_max: 20,
  health_regen: 0.5,
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
  public id: string;
  public password: string;
  public hash: number;
  public money: number;
  public energy: number;
  public level: number;
  public exp: number;
  public cooldown = 0;
  public stats: Stat = defaultStat;
  public status: Status = new Status();
  public inventory: Inventory = defaultInven; 
  public lang: Assets.bundle.language = "en";
  public countover = 0;
  public foundContents: {items: number[], units: number[]} = {items: [], units: []};
  public enemy: UnitEntity | undefined;
  public battleLog: string[] = [];
  public allLog = false;
  public selectBuilder?: PagesBuilder;

  constructor(data: {
    id: string, 
    password: string, 
    hash: number | string,
    lang?: Assets.bundle.language
  }) {
    this.id = data.id;
    this.password = data.password;
    this.hash = Number(data.hash);
    this.lang = data.lang || "en";
    this.money = 0;
    this.energy = 50;
    this.level = 1;
    this.exp = 0;
  }

  public init() {
		if(!this.foundContents.items) this.foundContents.items = this.inventory.items.map((i) => i.id);
		if(!this.foundContents.units) this.foundContents.units = [];
    this.status = new Status();
  }

  public update() {
		if (this.cooldown > 0) this.cooldown -= 1 / 100;

		this.stats.energy = Math.min(this.stats.energy_max, this.stats.energy + this.stats.energy_regen / 100);
		this.stats.health = Math.min(this.stats.health_max, this.stats.health + this.stats.health_regen / 100);
  }
  
  public giveItem(item: Item, amount = 1): string | null {
    const exist = this.inventory.items.find((i) => ItemStack.equals(i, item));
    if (exist) exist.amount += amount;
    else this.inventory.items.push(new ItemStack(item.id, amount, (item as unknown as Durable).durability));

    if (!this.foundContents.items.includes(item.id)) {
      this.foundContents.items.push(item.id);
      return Bundle.format(this.lang, 'firstget', item.localName(this));
    }

    return null;
  }

  public levelup() {
    const str = Bundle.format(
      this.lang,
      'levelup',
      this.id,
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

  public getInventory() {
    return `${Bundle.find(this.lang, 'inventory')}\n-----------\n${this.inventory.items.map((i) => {
      const item = ItemStack.getItem(i);
      return `• ${item.localName(this)} ${i.amount > 0 ? `(${`${i.amount} ${Bundle.find(this.lang, 'unit.item')}`})` : ''}\n   ${item.description(this)}${(item as unknown as Durable).durability ? `(${Bundle.find(this.lang, 'durability')}: ${i.durability}/${(item as unknown as Durable).durability})` : ''}`;
    }).join('\n\n')}`;
  }

  public async getUserInfo(msg: Message) {
    const user = msg.interaction.user;

    const canvas = Canvas.createCanvas(1000, 1000);
    Utils.Canvas.donutProgressBar(canvas, {
      progress: {
        now: this.exp,
        max: this.level ** 2 * 50
      },
      barWidth: 100,
      font: "bold 150px sans-serif",
      text: `${this.level}Lv`,
      smolfont: "bold 125px sans-serif",
      fontStyle: '#ffffff'
    });
    const attachment = new MessageAttachment(canvas.toBuffer(), 'profile-image.png');
    const weapon: Weapon = ItemStack.getItem(this.inventory.weapon);
    const button2 = new MessageButton().setCustomId('weapon_info').setLabel('get Weapon Info').setStyle('PRIMARY');
    const button1 = new MessageButton().setCustomId('inventory_info').setLabel('get Inventory Info').setStyle('PRIMARY');
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

    const builder = new PagesBuilder(msg.interaction);
    builder.setPages(statusEmbed);
    builder
      .setDescription('\u200B')
      .setDefaultButtons([])
      .setComponents(new MessageActionRow().addComponents([button1, button2])).addTriggers([{
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
              { name: 'durability', value: `${filledBar(weapon.durability||0, this.inventory.weapon.durability||0, 10, "\u2593", "\u2588")[0]}\n${Bundle.find(this.lang, 'durability')}: ${this.inventory.weapon.durability||0}/${weapon.durability||0}`, inline: true},
            )
          msg.interaction.followUp({embeds: [weaponEmbed]});
        }
      },{
        name: 'inventory_info',
        callback: (inter, cos) => {
          cos.setDisabled(true);
          msg.interaction.followUp(this.getInventory());
        }
      }])
    builder.build();
    msg.interaction.editReply({files: [attachment]});
  }

  public switchWeapon(msg: Message, name: string) {
    const item = Items.items.find((i) => i.localName(this) == name) as Weapon | undefined;
    if (!item) msg.interaction.followUp(Bundle.format(this.lang, 'switch_notFound', name));
    else {
      const entity = this.inventory.items.find((entity) => ItemStack.getItem(entity) == item);
      if (!entity) msg.interaction.followUp(Bundle.format(this.lang, 'switch_notHave', name));
      else {
        entity.amount--;
        if (!entity.amount) this.inventory.items.splice(this.inventory.items.indexOf(entity), 1);

        const exist: Item = ItemStack.getItem(this.inventory.weapon);
        if (exist) {
          msg.interaction.followUp(Bundle.format(this.lang, 'switch_change', name, exist.localName(this)));
          const given = this.giveItem(item);
          if (given) msg.interaction.followUp(given);
        } else { msg.interaction.followUp(Bundle.format(this.lang, 'switch_equip', name)); }

        this.inventory.weapon.id = item.id;
        this.inventory.weapon.durability = item.durability;
        save();
      }
    }
  }
}

export function create(msg: Message, users: User[], lang: Assets.bundle.language = "en") {
  const hash = msg.interaction.user.id;
  const id = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('id', true).replace(/[@]/g, "");
  const pw = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('pw', true);
  const user = users.find((u) => u.id == id);

  if (user) msg.interaction.followUp(Bundle.format(lang, "account.account_exist", id));
  else {
    const target = new User({id: id, password: pw, hash: hash});
    users.push(target);
    login(users, target, msg, lang);
    msg.interaction.followUp(Bundle.find(lang, "account.create_success"));
  }
}

export function remove(msg: Message, users: User[], lang: Assets.bundle.language = "en") {
  const hash = msg.interaction.user.id;
  const id = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('id', true).replace(/[@]/g, "");
  const pw = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('pw', true);
  const user = users.find((u) => u.id == id);
  
  if (!user) msg.interaction.followUp(Bundle.find(lang, "account.account_notFound"));
  else if (user.password !== pw)
    msg.interaction.followUp(Bundle.find(lang, "account.account_incorrect"));
  else if (user.hash !== Number(hash))
    msg.interaction.followUp(Bundle.find(lang, "account.account_notLogin"));
  else {
    users.splice(users.indexOf(user), 1);
    Database.writeObject("./Database/user_data", users);
    msg.interaction.followUp(Bundle.find(lang, "account.remove_success"));
  }
}

export function signin(msg: Message, users: User[], lang: Assets.bundle.language = "en") {
  const hash = msg.interaction.user.id;
  const id = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('id', true).replace(/[@]/g, "");
  const pw = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('pw', true);
  const user = users.find((u) => u.id == id);

  if (!user) msg.interaction.followUp(Bundle.find(lang, "account.account_notFound"));
  else if (user.password !== pw) 
    msg.interaction.followUp(Bundle.find(lang, "account.account_incorrect"));
  else if (user.hash)
    msg.interaction.followUp(
      user.hash == Number(hash)
        ? Bundle.find(lang, "account.account_have")
        : Bundle.find(lang, "account.account_has")
    );
  else login(users, user, msg, lang);
}

export function signout(msg: Message, users: User[], lang: Assets.bundle.language = "en") {
  const hash = msg.interaction.user.id;
  const user = users.find((u) => u.hash == Number(hash));

  if (!user) msg.interaction.followUp(Bundle.find(lang, "account.account_notLogin"));
  else {
    user.hash = 0;
    msg.interaction.followUp(Bundle.find(lang, "account.logout_success"));
    Database.writeObject("user_data", users);
  }
}

export function change(msg: Message, users: User[], lang: Assets.bundle.language = "en") {
  const type = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('type', true);
  const id = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('id', true).replace(/[@]/g, "");
  const pw = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('pw', true);
  const changeto = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('target', true);
  const user = users.find((u) => u.id == id);
  
  if (!user) msg.interaction.followUp(Bundle.find(lang, "account.account_notFound"));
  else if (type.toLowerCase() == "pw") {
    if (users.find((u) => u.id == changeto))
      msg.interaction.followUp(Bundle.format(lang, "account.account_exist", id));
    else {
      msg.interaction.followUp(
        Bundle.format(lang, "account.change_id", user.id, changeto)
      );
      user.id = changeto;
    }
  } else if (type.toLowerCase() == "id") {
    msg.interaction.followUp(
      Bundle.format(lang, "account.change_pw", user.id, changeto)
    );
    user.password = changeto;
  }

  Database.writeObject("./Database/user_data", users);
}
/*
export function setLang(msg: Message, users: User[], lang: Assets.bundle.language = "en") {
  const hash = msg.interaction.user.id;
  const langto: Assets.bundle.language = msg.content.split(/\s/)[1] as Assets.bundle.language;
  const user = users.find((u) => user.hash == Number(hash));

  if (!user) return msg.interaction.followUp(Bundle.find(lang, "account.account_notLogin"));
  else {
    user.lang = langto;
    msg.interaction.followUp(Bundle.format(lang, "account.lang_success", lang, langto));
    Database.writeObject("./Database/user_data", users);
  }
};
*/

