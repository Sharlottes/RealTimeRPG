import Assets from '../assets';
import { Entity, ItemStack } from "../game";
import { Utils } from "../util";
import { Message } from "..";
import Discord, { CacheType } from 'discord.js';

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
  public enemy: Entity.UnitEntity | undefined;
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

