import Assets from '../assets';
import { Item, Items, ItemStack, UnitEntity, Weapon } from "../game";
import { Utils } from "../util";
import { Message } from "..";
import Discord, { CacheType } from 'discord.js';
import { findMessage, save } from '@뇌절봇/game/rpg_';
import { Durable } from '@뇌절봇/@type';

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

export type Stat = {
  health: number;
  health_max: number;
  health_regen: number;
  energy: number;
  energy_max: number;
  energy_regen: number;
  strength: number;
  defense: number;
};

export type Inventory = {
  items: ItemStack[];
  weapon: ItemStack;
};

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
  public cooldown = 0; //무기 쿨다운
  public stats: Stat = defaultStat;
  public status: Status = new Status();
  public inventory: Inventory = defaultInven; 
  public lang: Assets.bundle.language = "en";
  public countover = 0;
  public foundContents: Map<string, number[]> = new Map().set("item", []).set("unit", []);
  public battleInterval: NodeJS.Timeout | undefined | void;
  public enemy: UnitEntity | undefined;
  public battleLog: string[] = [];
  public allLog = false;

  constructor(id: string, password: string, hash: number | string, lang: Assets.bundle.language = "en") {
    this.id = id;
    this.password = password;
    this.hash = Number(hash);
    this.lang = lang;
    this.money = 0;
    this.energy = 50;
    this.level = 1;
    this.exp = 0;
  }
 
  public init() {
    if (!this.foundContents.get) this.foundContents = new Map().set('item', this.inventory.items.map((i) => i.id)).set('unit', []);
		if (!this.foundContents.get('item')) this.foundContents.set('item', []);
		if (!this.foundContents.get('unit')) this.foundContents.set('unit', []);
		if (this.stats.health <= 0) this.stats.health = this.stats.health_max;
		this.inventory.items.forEach((entity, i) => {
			const exist = this.inventory.items.find((e) => e != entity && e.id == entity.id);
			if (exist) {
				exist.amount += entity.amount;
				this.inventory.items.splice(i, 1);
			}
		});
  }

  public giveItem(item: Item, amount = 1): string | null {
    const exist = this.inventory.items.find((i) => ItemStack.equals(i, item));
    if (exist) exist.amount += amount;
    else this.inventory.items.push(new ItemStack(item.id, amount, (item as unknown as Durable).durability));

    if (!this.foundContents.get('item')?.includes(item.id)) {
      this.foundContents.get('item')?.push(item.id);
      save();
      return Bundle.format(this.lang, 'firstget', item.localName(this));
    }

    save();
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

  public getUserInfo() {
    let weapon: Weapon = ItemStack.getItem(this.inventory.weapon);
    if (!weapon) {
      this.inventory.weapon.id = 5;
      weapon = Items.find(5);
      save();
    }

    return Bundle.format(
      this.lang,
      'status_info',
      this.id,
      this.level,
      this.exp,
      this.level ** 2 * 50,
      this.money,
      this.stats.energy.toFixed(1),
      this.stats.energy_max,
      this.stats.energy_regen,
      this.stats.health.toFixed(1),
      this.stats.health_max,
      this.stats.health_regen,
      weapon.localName(this),
      this.inventory.weapon.durability && weapon.durability
        ? `(${Bundle.find(this.lang, 'durability')}: ${this.inventory.weapon.durability}/${weapon.durability})`
        : '',

      weapon.cooldown,
      weapon.damage,
      (weapon.critical_chance * 100).toFixed(2),
      (weapon.critical_ratio * 100).toFixed(2),
    );
  }

  public switchWeapon(msg: Message, name: string) {
    const item = Items.getItems().find((i) => i.localName(this) == name) as Weapon | undefined;
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

  if (!id || !pw) msg.interaction.followUp(Bundle.find(lang, "account.create_help"));
  else if (user)
    msg.interaction.followUp(Bundle.format(lang, "account.account_exist", id));
  else {
    const target = new User(id, pw, hash);
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
  if (!id || !pw) msg.interaction.followUp(Bundle.find(lang, "account.remove_help"));
  else if (!user) msg.interaction.followUp(Bundle.find(lang, "account.account_notFound"));
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
  if (!id || !pw) msg.interaction.followUp(Bundle.find(lang, "account.login_help"));
  else if (!user) msg.interaction.followUp(Bundle.find(lang, "account.account_notFound"));
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
  if (!id || !pw || !type || !(type.toLowerCase() == "id" || type.toLowerCase() == "pw") || !changeto)
    msg.interaction.followUp(Bundle.find(lang, "account.change_help"));
  else if (!user) 
    msg.interaction.followUp(Bundle.find(lang, "account.account_notFound"));
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
  if (!langto)
    return msg.interaction.followUp(
      Bundle.format(lang, "account.lang_help", "ko | en")
    );

  msg.interaction.followUp(Bundle.format(lang, "account.lang_success", lang, langto));
  user.lang = langto;
  Database.writeObject("./Database/user_data", users);
};
*/

