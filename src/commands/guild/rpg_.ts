import { SlashCommandBuilder } from "@discordjs/builders"
import Discord, { CacheType, CommandInteraction, Interaction, MessageActionRow, MessageActionRowComponent, MessageButton, MessageEmbed, MessageSelectMenu } from "discord.js";

import { UserSecure } from "../../modules";
import { Utils } from "../../util";
import { Entity, Contents } from "../../game";
import Assets from "../../assets";
import { Message } from "../..";

import CM from "../";
import { ITrigger, PagesBuilder, PagesManager } from 'discord.js-pages';
import { CommandCategory } from '../Command';

type User = UserSecure.User;
type Unit = Contents.Unit;
type Item = Contents.Item;
type UnitEntity = Entity.UnitEntity;
type ItemStack = Contents.ItemStack;

const Bundle = Assets.bundle;
const ItemStack = Contents.ItemStack;
const UnitEntity = Entity.UnitEntity;
const Strings = Utils.Strings;
const Mathf = Utils.Mathf;
const Database = Utils.Database;
const prefix: string = "/";
const latestMsgs: LatestMsg[] = [];
const Commands: Map<Assets.bundle.language, Map<string, Function>[]> = new Map();
const rooms: string[] = ["Sharlotted Bot Test"]
const pagesManager = new PagesManager();

let users: UserSecure.User[] = read();

type LatestMsg = {
  id: string,
  msg: Message
};

class EventSelection {
  name: string;
  localName: (user: User)=>string;
  callback: (msg: Message, user: User, target: UnitEntity)=>void|boolean;

  constructor(name: string | ((user: User)=>string), callback: (msg: Message, user: User, target: UnitEntity)=>void) {
    this.name = name instanceof Function ? "" : name;
    this.localName = (user: User)=> (name instanceof Function ? name(user) : Bundle.find(user.lang, `select.${name}`));
    this.callback = callback;
  }
};

class EventData {
  ratio: number;
  func: (user?: User, target?: Unit) => void;
  selection?: EventSelection[];

  constructor(ratio: number, callback: (user?: User, target?: Unit) => void, selections?: EventSelection[]) {
    this.ratio = ratio;
    this.func = callback;
    this.selection = selections;
  }
}

function statusCmd(msg: Message, user: User, lang: Assets.bundle.language) {
  var targetid = msg.discordobj ? (msg.discordobj as Discord.CommandInteraction<CacheType>).options.getString('target', false) : msg.content.split(/\s/)[1];
  var target = targetid?users.find((u) => u.id == targetid):user;
  if(targetid&&!target) 
    return msg.replyText(Bundle.format(lang, "account.account_notFound", targetid));
  msg.replyText(getUserInfo(target as User));
};

function inventoryCmd(msg: Message, user: User, lang: Assets.bundle.language) {
  var targetid = msg.discordobj ? (msg.discordobj as Discord.CommandInteraction<CacheType>).options.getString('target', false) : msg.content.split(/\s/)[1];
  var target = targetid?users.find((u) => u.id == targetid):user;
  if(targetid&&!target) 
    return msg.replyText(Bundle.format(lang, "account.account_notFound", targetid));
  msg.replyText(getInventory(target as User));
};

function consumeCmd(msg: Message, user: User, lang: Assets.bundle.language) {
  let name = msg.discordobj ? (msg.discordobj as Discord.CommandInteraction<CacheType>).options.getString('target', true) : msg.content.split(/\s/).slice(1).join(" ");
  if (!name) return msg.replyText(prefix+Bundle.find(lang, "command.consume_help"));
  
  let stack: ItemStack | undefined = user.inventory.items.find(i=>ItemStack.getItem(i).localName(user)==name);
  if (!stack) return msg.replyText(Bundle.format(lang, "account.notFound", name));
  let result = ItemStack.consume(stack, user);
  if(result) msg.replyText(result);
  save();
};

function contentInfoCmd(msg: Message, user: User, lang: Assets.bundle.language) {
  msg.replyText(getContentInfo(user, msg) as string);
};

function weaponChangeCmd(msg: Message, user: User, lang: Assets.bundle.language) {
  let weapon = msg.discordobj ? (msg.discordobj as Discord.CommandInteraction<CacheType>).options.getString('target', true) : msg.content.split(/\s/).slice(1).join(" ");
  if (!weapon) msg.replyText(prefix+Bundle.find(lang, "command.swap_help"));
  else switchWeapon(user, msg, weapon);
};

function walkingCmd(msg: Message, user: User, lang: Assets.bundle.language) {
  if(user.status.name == "selecting") return (msg.discordobj as Discord.CommandInteraction<CacheType>)?.followUp("you cannot walk while selecting!");
  if (user.stats.energy < 7) {
    if (user.countover >= 3) {
      msg.replyText(Bundle.find(lang, "calmdown"));
    } else {
      user.countover++;
      msg.replyText(Bundle.format(lang, "notEnergy", user.stats.energy.toFixed(1), 7));
    }
  } else {
    user.countover = 0;
    search(msg, user);
  }
  save();
};

function registerCmd(builder: SlashCommandBuilder, callback: Function, requireUser: boolean = true, dmOnly: boolean = false, cate: CommandCategory = "guild") {
  CM.register({
    category: cate, // 이거 맞음
    dmOnly: dmOnly&&false,
    debug: false,
    run: interaction => {
      let user = users.find((u) => u.hash == parseInt(interaction.user.id));
      if(requireUser&&!user) 
        interaction.followUp(Bundle.find((interaction.locale as Assets.bundle.language) || "en", "account.account_notLogin"));
      else callback({
        discordobj: interaction,
        room: "",
        content: "",
        sender: {
            name: interaction.user.username,
            hash: interaction.user.id
        },
        isGroupChat: false,
        replyText: (msg: any, room?:string)=>{
          if(msg.type=="edit") interaction.editReply(msg.content);
          else if(msg.embed) interaction.followUp({embeds: msg.embed});
          else interaction.followUp(msg.content||msg);        
        }
      }, user, user?.lang);
    },
    setHiddenConfig: arg => arg,
    builder: builder
  });
} 

export function init() {
  users.forEach(user => {
    if(!user.foundItems) user.foundItems = [];
    if(user.stats.health <= 0) user.stats.health = user.stats.health_max;
  });
  Contents.Items.init();
  Contents.Units.init();

  (["ko", "en"] as Assets.bundle.language[]).forEach(lang => {
    const userCommands: Map<string, (msg: Message, user: User, lang: Assets.bundle.language)=>void> = new Map();
    const commands: Map<string, (msg: Message)=>void> = new Map();
    
    userCommands.set(Bundle.find(lang, "command.status"), statusCmd);
    userCommands.set(Bundle.find(lang, "command.inventory"), inventoryCmd);
    userCommands.set(Bundle.find(lang, "command.consume"), consumeCmd);
    userCommands.set(Bundle.find(lang, "command.info"), contentInfoCmd);
    userCommands.set(Bundle.find(lang, "command.swap"), weaponChangeCmd);
    userCommands.set(Bundle.find(lang, "command.walking"), walkingCmd);

    commands.set(Bundle.find(lang, "command.accounts"), (msg: Message)=> msg.replyText(users.map((u) => u.id).join(" | ")));
    commands.set(Bundle.find(lang, "command.register"), (msg: Message)=> UserSecure.create(msg, users, lang));
    commands.set(Bundle.find(lang, "command.remove"), (msg: Message)=> UserSecure.remove(msg, users, lang));
    commands.set(Bundle.find(lang, "command.signin"), (msg: Message)=> UserSecure.signin(msg, users, lang));
    commands.set(Bundle.find(lang, "command.signout"), (msg: Message)=> UserSecure.signout(msg, users, lang));
    commands.set(Bundle.find(lang, "command.change"), (msg: Message)=> UserSecure.change(msg, users, lang));
    commands.set(Bundle.find(lang, "command.language"), (msg: Message)=> UserSecure.setLang(msg, users, lang));

    Commands.set(lang, [userCommands, commands]);
  });

  registerCmd((()=>{
    var s = new SlashCommandBuilder().setName("status").setDescription("show your or someone's own status");
    s.addStringOption(option => option.setName("target").setDescription("target user id").addChoices(users.map(u=>[u.id, u.id])));
    return s;
  })(), statusCmd);
  registerCmd((()=>{
    var s = new SlashCommandBuilder().setName("inventory").setDescription("show your or someone's own inventory");
    s.addStringOption(option => option.setName("target").setDescription("target user id").addChoices(users.map(u=>[u.id, u.id])));
    return s;
  })(), inventoryCmd);
  registerCmd((()=>{
    var s = new SlashCommandBuilder().setName("consume").setDescription("consume item");
    s.addStringOption(option => option.setName("target").setDescription("target item name").setRequired(true).addChoices(Contents.Items.getItems().filter(i=>(i as unknown as Contents.Consumable).consume).map(u=>[u.localName(), u.localName()])));
    return s;
  })(), consumeCmd);
  registerCmd((()=>{
    var s = new SlashCommandBuilder().setName("swap").setDescription("swap the weapon");
    s.addStringOption(option => option.setName("target").setDescription("target weapon name").setRequired(true).addChoices(Contents.Items.getItems().filter(i=>(i as unknown as Contents.Weapon).damage).map(u=>[u.localName(), u.localName()])));
    return s;
  })(), weaponChangeCmd);

  registerCmd(new SlashCommandBuilder().setName("walk").setDescription("just walk around"), walkingCmd);
  registerCmd(new SlashCommandBuilder().setName("accounts").setDescription("show all accounts"), (msg: Message)=>msg.replyText(users.map((u) => u.id).join(" | ")));
  registerCmd(new SlashCommandBuilder().setName("signout").setDescription("sign current account out"), (msg: Message)=>UserSecure.signout(msg, users), true);
  registerCmd((()=>{
    var s = new SlashCommandBuilder().setName("register").setDescription("register new account");
    s.addStringOption(option => option.setRequired(true).setName("id").setDescription("account id"));
    s.addStringOption(option => option.setRequired(true).setName("pw").setDescription("account passward"));
    return s;
  })(), (msg: Message)=>UserSecure.create(msg, users), false, true);
  registerCmd((()=>{
    var s = new SlashCommandBuilder().setName("remove").setDescription("remove current account and sign out");
    s.addStringOption(option => option.setRequired(true).setName("id").setDescription("account id"));
    s.addStringOption(option => option.setRequired(true).setName("pw").setDescription("account passward"));
    return s;
  })(), (msg: Message)=>UserSecure.remove(msg, users), true, true);
  registerCmd((()=>{
    var s = new SlashCommandBuilder().setName("signin").setDescription("sign existed account in");
    s.addStringOption(option => option.setRequired(true).setName("id").setDescription("account id"));
    s.addStringOption(option => option.setRequired(true).setName("pw").setDescription("account passward"));
    return s;
  })(), (msg: Message)=>UserSecure.signin(msg, users), false, true);
  registerCmd((()=>{
    var s = new SlashCommandBuilder().setName("change").setDescription("change passward or id");
    s.addStringOption(option => option.setRequired(true).setName("type").setDescription("id or passward").addChoices([["id", "id"], ["pw", "pw"]]));
    s.addStringOption(option => option.setRequired(true).setName("id").setDescription("account id"));
    s.addStringOption(option => option.setRequired(true).setName("pw").setDescription("account passward"));
    s.addStringOption(option => option.setRequired(true).setName("target").setDescription("new id/pw"));
    return s;
  })(), (msg: Message)=>UserSecure.change(msg, users), true, true);
  console.log("init done");
}

function makeSelection(user: User, entity: UnitEntity, selections: EventSelection[]) {
  user.status.name = "selecting";
  user.status.callback = (m, u) => {
    let select =
      selections[parseInt(m.content.split(/\s/)[0].replace(/\D/g, ""))];
    if (select) {
      u.status.clearSelection();
      select.callback(m, u, entity);
    }
  };
  return selections.map((e, i) => i + ". " + e.localName(user)).join("\n");
}

const battleSelection = [
  new EventSelection("attack", (msg, user, t) => {
    let target = user.enemy || t;
    if (user.cooldown > 0) {
      if(msg.builder) 
        msg.builder.setDescription(msg.builder.description+"```diff\n+ "+Bundle.format(user.lang, "battle.cooldown", user.cooldown.toFixed(2))+"\n```");
      else 
        msg.replyText(Bundle.format(user.lang, "battle.cooldown", user.cooldown.toFixed(2))+"\n"+makeSelection(user, target, battleSelection));
      return false;
    }

    let weapon: Contents.Weapon = ItemStack.getItem(user.inventory.weapon);
    if (!weapon) return false;
    
    if(user.inventory.weapon.durability) user.inventory.weapon.durability--;
    if(msg.builder) 
      msg.builder.setDescription(msg.builder.description+"```diff\n+ "+weapon.attack(user, target)+"\n```");
    else
    msg.replyText(weapon.attack(user, target));

    if (!user.inventory.weapon.durability || user.inventory.weapon.durability < 0) {
      if(user.inventory.weapon.id !== 5) {
        if(msg.builder) 
          msg.builder.setDescription(msg.builder.description+"```diff\n+ "+Bundle.format(user.lang, "battle.broken", weapon.localName(user))+"\n```");
        else
          msg.replyText(Bundle.format(user.lang, "battle.broken", weapon.localName(user)));
        user.inventory.weapon.id = 5;
      }
    }

    if (target.health <= 0) {
      const result = "```diff\n+ "+(target.health < 0 ? Bundle.find(user.lang, "battle.overkill") + " " : "") + Bundle.format(user.lang, "battle.win", target.health.toFixed(2))+"\n```\n```ini\n["+battlewin(user, Contents.Units.find(target.id))+"]```";
      
      if(msg.builder) 
        msg.builder.setDescription(msg.builder.description+result);
      else
        msg.replyText(result);

      user.enemy = undefined;
      msg.builder = null;
      user.status.clearSelection();
      return true;
    } else if(!msg.discordobj) msg.replyText(makeSelection(user, target, battleSelection));

    return false;
  })
];

function battle(msg: Message, user: User, entity: UnitEntity) {
  const str = Bundle.format(user.lang, "battle.start", user.id, Contents.Units.find(entity.id).localName(user));
  let interval: NodeJS.Timer;
  let buttons: Discord.MessageActionRow;
  if(Contents.Items.find(entity.items.weapon.id)) {
    interval = setInterval(entity => {
      if (entity.cooldown <= 0) {
        entity.cooldown = (Contents.Items.find(entity.items.weapon.id) as Contents.Weapon).cooldown;
        if(msg.builder) {
          msg.builder.setDescription(msg.builder.description+"```diff\n- "+(Contents.Items.find(entity.items.weapon.id) as Contents.Weapon).attackEntity(user)+"\n```");
          (msg.discordobj as CommandInteraction).editReply({embeds: [msg.builder]});
        } else
          msg.replyText({ content: (Contents.Items.find(entity.items.weapon.id) as Contents.Weapon).attackEntity(user), type: "edit" });
      }
      else entity.cooldown -= 100 / 1000;

      if (user.stats.health <= 0) {
        if(msg.builder) {
          msg.builder.setDescription(msg.builder.description+"```diff\n- "+Bundle.format(user.lang, "battle.lose", user.stats.health.toFixed(2))+"\n```");
          buttons?.components.forEach(c=>c.setDisabled(true));
          (msg.discordobj as CommandInteraction).editReply({embeds: [msg.builder]});

          user.enemy = undefined;
          msg.builder = null;
          user.status.clearSelection();
        } else msg.replyText(Bundle.format(user.lang, "battle.lose", user.stats.health.toFixed(2)));
        
        user.stats.health = 0.1 * user.stats.health_max;
        user.status.clearSelection();
        clearInterval(interval);
      }
    }, 100, entity);
  }

  if(msg&&msg.discordobj&&msg.builder){
    buttons = new MessageActionRow().setComponents(battleSelection.map((e,i)=>new MessageButton().setCustomId(e.localName(user)+i).setLabel(e.localName(user)).setStyle('PRIMARY')));
    user.enemy = undefined;
    msg.builder
      .setDescription(str)
      .setComponents(buttons)
      .setTriggers(battleSelection.map((e,i)=>{
        const obj = {
          name: e.localName(user)+i,
          callback(interactionCallback, button) {
              msg.discordobj = interactionCallback as Discord.Interaction;
              if(!battleSelection) return;
              let select = battleSelection[parseInt(obj.name.replace(/\D/g,""))];
              if (select) {
                const entity = user.enemy || new UnitEntity(Contents.Units.getUnits()[0]);
                if(!user.enemy) user.enemy = entity;
                if(msg.builder&&select.callback(msg, user, entity)) {
                  buttons.components.forEach(c=>c.setDisabled(true));
                  if(interval) clearInterval(interval);
                  msg.builder = null;
                }
              }
          }
        } as ITrigger<MessageActionRowComponent>;

        return obj;
      }));
  }
  else msg.replyText(str+"\n"+makeSelection(user, entity, battleSelection));
}

function battlewin(user: User, unit: Unit) {
  let items = [];
  for (let i = 0; i < Math.floor(Mathf.range(unit.level, unit.level + 2)+1); i++) {
    let item = getOne(Contents.Items.getItems().filter((i) => i.dropableOnBattle()), "rare");
    if (item) {
      let obj = items.find((i) => i.item == item);
      if (obj) obj.amount++;
      else items.push({ item: item, amount: 1 });
    }
  }
  let str = Bundle.format(user.lang, "battle.result", 
    user.exp,
    (user.exp += unit.level * (1 + unit.rare) * 10),
    items.map((i) => `${i.item.localName(user)} +${i.amount} ${Bundle.find(user.lang, "unit.item")}`).join("\n")
  ) + items.map((i) => giveItem(user, i.item)).filter(e=>e).join("\n");
  save();
  return str;
}

function giveItem(user: User, item: Item, amount: number=1): string | null {
  let exist = user.inventory.items.find((i) => ItemStack.equals(i, item));
  if (exist) exist.amount += amount;
  else user.inventory.items.push(new ItemStack(item.id, amount, (item as unknown as Contents.Durable).durability));
  save();

  if(!user.foundItems.includes(item.id)) {
    user.foundItems.push(item.id);
    return Bundle.format(user.lang, "firstget", item.localName(user));
  }
  return null;
}

const exchangeSelection: EventSelection[] = [
  new EventSelection("buy", (msg, user, target) => {
    let repeat = (m: Message, u: UserSecure.User, t: UnitEntity) => {
      msg.replyText(makeSelection(u, t, target.items.items.map((entity) => {
        let item = ItemStack.getItem(entity);
        let money = item.cost * 25;

        return new EventSelection(
          u=>`${item.localName(user)}: ${money+Bundle.format(u.lang, "unit.money")} (${entity.amount+Bundle.format(u.lang, "unit.item")} ${Bundle.format(u.lang, "unit.item_left")})`,
          (m, u, t) => {
            let amount = Number((m.content.split(/\s/)[1] || "1").replace(/\D/g, "") || 1);
            if (amount > entity.amount)
              msg.replyText(Bundle.format(u.lang, "shop.notEnough_item", item.localName(user), amount, entity.amount));
            else if (u.money < amount * money)
              msg.replyText(Bundle.format(u.lang, "shop.notEnough_money", amount * money, u.money));
            else {
              msg.replyText(Bundle.format(u.lang, "shop.buyed", item.localName(user), amount, u.money, (u.money -= money * amount)));
              entity.amount = entity.amount-amount;
              const given = giveItem(u, item, amount);
              if(given) m.replyText(given);
              if (!entity.amount) t.items.items.splice(t.items.items.indexOf(entity), 1);
              save();
            }
              
            repeat(msg, u, t);
          }
        )
      })
      .concat(new EventSelection("back", (m, u, t) => msg.replyText(makeSelection(u, t, exchangeSelection))))));
    };

    repeat(msg, user, target);
  }),
  new EventSelection("sell", (msg, user, target) => {
    let repeat = (m: Message, u: UserSecure.User, t: UnitEntity) => {
      msg.replyText(makeSelection(u, t, u.inventory.items.map((entity) => {
        let item = ItemStack.getItem(entity);
        let money = item.cost * 10;

        return new EventSelection(
          u=>`${item.localName(u)}: ${money+Bundle.format(u.lang, "unit.money")} (${entity.amount+Bundle.format(u.lang, "unit.item")} ${Bundle.format(u.lang, "unit.item_left")})`,
          (m: Message, u: UserSecure.User, t: UnitEntity) => {
            let amount = Number((m.content.split(/\s/)[1] || "1").replace(/\D/g, "") || 1);
                
            if (amount > entity.amount)
              msg.replyText(Bundle.format(u.lang, "shop.notEnough_item", item.localName(u), amount, entity.amount));
            else {
              msg.replyText(Bundle.format(u.lang, "shop.selled", item.localName(u), amount, u.money, (u.money += money * amount)));
              entity.amount = entity.amount-amount;
              if (!entity.amount) u.inventory.items.splice(u.inventory.items.indexOf(entity), 1);
              save();
            }

            repeat(msg, u, t);
          }
        );
      })
      .concat(new EventSelection("back", (m, u, t) => msg.replyText(makeSelection(u, t, exchangeSelection))))));
    };

    repeat(msg, user, target);
  }),
  new EventSelection("back", (msg, user) => msg.replyText(Bundle.find(user.lang, "shop.end")))
];


const eventData = [
  new EventData(5, user=> Bundle.find(user?.lang, "battle.ignore")),
  new EventData(15, user=> {
    if(!user) return;
    let money = 2 + Math.floor(Math.random() * 10);
    user.money += money;

    return Bundle.format(user.lang, "event.money", money);
  }),
  new EventData(10, user=> Bundle.find(user?.lang, "event.goblin"),
    [
      new EventSelection("run", (m, u) => {
        if (Mathf.randbool()) {
          let money = Math.floor(Mathf.range(2, 10));
          u.money -= money;
          m.replyText(Bundle.format(u.lang, "event.goblin_run_failed", money));
        } else {
          m.replyText(Bundle.find(u.lang, "event.goblin_run_success"));
        }
      }),
      new EventSelection("talking", (m, u) => {
        let money = Math.floor(Mathf.range(2, 5));
        u.money -= money;
        m.replyText(Bundle.format(u.lang, "event.goblin_talking", money));
      }),
      new EventSelection("exchange", (m, u) => {
        let goblin = new UnitEntity(Contents.Units.find(1));
        for (let i = 0; i < 20; i++) {
          let item = getOne(Contents.Items.getItems().filter((i) => i.dropableOnShop()&&i.id!==5), "rare");
          let exist = goblin.items.items.find((entity) => ItemStack.getItem(entity) == item);
          if (exist) exist.amount++;
          else goblin.items.items.push(new ItemStack(item.id,1,item.durability));
        }
        m.replyText(Bundle.find(u.lang, "event.goblin_exchange"));
        m.replyText(makeSelection(u, goblin, exchangeSelection));
      })
    ]
  ),
  new EventData(25, user=> {
    if(!user) return;
    const item = getOne(Contents.Items.getItems().filter((i) => i.dropableOnWalking()), "rare");
    return Bundle.format(user.lang, "event.item", item.localName(user)) + (giveItem(user, item)||"");
  }),
  new EventData(20, user=> Bundle.find(user?.lang, "event.obstruction"),
    [
      new EventSelection("battle", (m, u) => battle(m, u, new UnitEntity(Contents.Units.find(0)))),
      new EventSelection("run", (m, u) => m.replyText(Bundle.find(u.lang, "event.obstruction_run")))
    ]
  ),
];

/**
 *
 * @param {array} arr 아이템을 뽑을 아이템 배열
 * @param {string} ratio 아이템 비율 속성이름
 * @returns arr 배열의 인수 중 하나를 랜덤하게 반환
 */
function getOne(arr: any[], ratio: string) {
  let random = Math.random();
  let total = arr.reduce((a, e) => a + e[ratio], 0);
  for (var i in arr) {
    random -= arr[i][ratio] / total;
    if (random < 0) return arr[i];
  }
}

function levelup(user: User) {
  let str = Bundle.format(user.lang, "levelup", 
      user.id,
      user.level,
      user.level + 1,
      user.stats.health_max,
      (user.stats.health_max += Math.pow(user.level, 0.6) * 5),
      user.stats.energy_max,
      (user.stats.energy_max += Math.pow(user.level, 0.4) * 2.5)
  );
  let latestMsg = latestMsgs.find(u=>u.id==user.id);
  rooms.forEach((room) => latestMsg?.msg.replyText(room, str));
  user.stats.health = user.stats.health_max;
  user.stats.energy = user.stats.energy_max;
  user.level++;
  save();
}

function checkusers() {
  users.forEach((user) => {
    if (user.exp > Math.pow(user.level, 2) * 50) {
      levelup(user);
    }
  });
}

const inter = setInterval(() => {
  users.forEach((u) => {
    if (u.cooldown > 0) u.cooldown -= 1 / 100;

    u.stats.energy = Math.min(u.stats.energy_max, u.stats.energy + u.stats.energy_regen / 100);
  });
}, 10);

function startEvent(event: EventData, msg: Message, user: User) {
  const str = event.func(user);
  
  msg.replyText(str);
  if (event.selection) {
    user.status.name = "selecting";
    if(msg.discordobj){
      const buttons = new MessageActionRow().setComponents(event.selection.map((e,i)=>new MessageButton().setCustomId(e.localName(user)+i).setLabel(e.localName(user)).setStyle('PRIMARY')));
      msg.builder = new PagesBuilder(msg.discordobj as Discord.CommandInteraction)
        .setTitle(str+"")
        .setDescription(event.selection.map((e, i) => i + ". " + e.localName(user)).join("\n"))
        .setPages(()=>new MessageEmbed())
        .setDefaultButtons([])
        .setComponents(buttons)
        .setTriggers(event.selection.map((e,i)=>{
          const obj = {
            name: e.localName(user)+i,
            callback(interactionCallback, button) {
                buttons.components.forEach(c=>c.setDisabled(true));
                msg.discordobj = interactionCallback as Discord.Interaction;
                if(!event.selection) return;
                event.selection[parseInt(obj.name.replace(/\D/g,""))]?.callback(msg, user, new UnitEntity(Contents.Units.getUnits()[0]));
            }
          } as ITrigger<MessageActionRowComponent>;

          return obj;
        }));
      msg.builder.build();
    } else {
      user.status.callback = (m, u) => {
        if(!event.selection) return;
        let select = event.selection[parseInt(m.content.replace(/\D/g, ""))];
        if (select) {
          user.status.clearSelection();
          select.callback(msg, user, new UnitEntity(Contents.Units.getUnits()[0]));
        }
      };
      msg.replyText(event.selection.map((e, i) => i + ". " + e.localName(user)).join("\n"));
    }
  }
}

function search(msg: Message, user: User) {
  let event = getOne(eventData, "ratio");
  if (!event) return msg.replyText(Bundle.find(user.lang, "event.phytoncide"));
  startEvent(event, msg, user);
  user.stats.energy -= 7;
}

function info(user: User, content: Item|Unit) {
  return (
    (user.foundItems.includes(content.id)
      ? content.localName(user) 
      : content.localName(user).replace(/./g, "?")) +
    "\n" +
    (user.foundItems.includes(content.id)
      ? content.description(user)
      : content.description(user).replace(/./g, "?")) +
    (content.details 
      ? "\n------------\n  " + (user.foundItems.includes(content.id)
        ? content.details(user)
        : content.details(user).replace(/./g, "?")) + "\n------------"
      : "")
  );
}

function getContentInfo(user: User, msg: Message) {
  const [, type] = msg.content.split(/\s/);
  if (type != "아이템" && type != "유닛")
    return msg.replyText("!도감 (아이템|유닛) [이름]");

  let str = "";
  let name = msg.content.split(/\s/).slice(2).join(" ");
  if (type == "유닛") {
    if (name && !Contents.Units.getUnits().some((u) => u.localName(user) == name))
      return msg.replyText(Strings.format("유닛 {0}(을)를 찾을 수 없습니다.", name));
    str = Strings.format("유닛\n===============\n\n{0}\n\n", [name
        ? info(user, Contents.Units.getUnits().find((u) => u.localName(user) == name) as Unit)
        : Contents.Units.getUnits().map((c) => info(user, c)).join("\n\n")
    ]);
  } else if (type == "아이템") {
    if (name && !Contents.Items.getItems().some((u) => u.localName(user) == name))
      return msg.replyText(Strings.format("아이템 {0}(을)를 찾을 수 없습니다.", name));
    str = Strings.format("아이템\n===============\n\n{0}\n\n", name 
      ? info(user,Contents.Items.getItems().find((u) => u.localName(user) == name) as Item)
      : Contents.Items.getItems().map((c) => info(user, c)).join("\n\n")
    );
  }
  return str;
}

function getInventory(user: User) {
  return Bundle.find(user.lang, "inventory")+"\n-----------\n"+user.inventory.items.map((i) => {
    let item = ItemStack.getItem(i);
    return `• ${item.localName(user)} ${i.amount > 0 ? `(${i.amount+" "+Bundle.find(user.lang, "unit.item")})` : ""}\n   ${item.description(user)}${(item as unknown as Contents.Durable).durability ? `(${Bundle.find(user.lang, "durability")}: ${i.durability}/${(item as unknown as Contents.Durable).durability})` : ""}`;
  }).join("\n\n");
}

function getUserInfo(user: User) {
  let weapon: Contents.Weapon = ItemStack.getItem(user.inventory.weapon);
  if (!weapon) {
    user.inventory.weapon.id = 5;
    weapon = Contents.Items.find(5);
    save();
  }
  
  return Bundle.format(user.lang, "status_info", 
    user.id,
    user.level,
    user.exp,
    Math.pow(user.level, 2) * 50,
    user.money,
    user.stats.energy.toFixed(1),
    user.stats.energy_max,
    user.stats.energy_regen,
    user.stats.health.toFixed(1),
    user.stats.health_max,
    user.stats.health_regen,
    weapon.localName(user), 
      user.inventory.weapon.durability && weapon.durability
      ? `(${Bundle.find(user.lang, "durability")}: ${user.inventory.weapon.durability}/${weapon.durability})`
      : "",

    weapon.cooldown,
    weapon.damage,
    (weapon.critical_ratio * 100).toFixed(2),
    (weapon.critical_chance * 100).toFixed(2)
  );
}

function switchWeapon(user: User, msg: Message, name: string) {
  let item = Contents.Items.getItems().find((i) => i.localName(user) == name);
  if (!item) msg.replyText(Bundle.format(user.lang, "switch_notFound", name));
  else {
    let entity = user.inventory.items.find((entity) => ItemStack.getItem(entity) == item);
    if (!entity) msg.replyText(Bundle.format(user.lang, "switch_notHave", name));
    else {
      entity.amount--;
      if (!entity.amount) user.inventory.items.splice(user.inventory.items.indexOf(entity), 1);

      let exist: Item = ItemStack.getItem(user.inventory.weapon);
      if (exist) {
        msg.replyText(Bundle.format(user.lang, "switch_change", name, exist.localName(user)));
        const given = giveItem(user, item);
        if(given) msg.replyText(given);
      } else 
        msg.replyText(Bundle.format(user.lang, "switch_equip", name));
      
      
        user.inventory.weapon.id = item.id;

      save();
    }
  }
}

function read() {
  let users: User[] = Database.readObject<Array<User>>("./Database/user_data");
  return users.map(u=>{
    u.inventory.weapon = ItemStack.from(u.inventory.weapon);
    u.inventory.items.forEach(stack => stack = ItemStack.from(stack));
    u.status = new UserSecure.Status();
    return u;
  });
}

function save() {
  checkusers();
  Database.writeObject("./Database/user_data", users);
}

export function onMessage(msg: Message) {
  if (!msg || (msg.isGroupChat && !rooms.includes(msg.room))) return;
  const hash = msg.sender.hash;
  const user = users.find((u) => u.hash == hash);
  console.log(`${new Date().toLocaleString()} ---------- [${msg.room||(`${msg.discordobj?.guild?.name} - ${msg.discordobj?.channel?.id&&msg.discordobj?.guild?.channels.cache.get(msg.discordobj?.channel?.id)?.name}`)}] ${msg.sender.name}: ${msg.content}`);

  if (user) {
    let exist = latestMsgs.find(u=>u.id==user.id);
    if(exist) exist.msg = msg;
    else latestMsgs.push({
      id: user.id,
      msg: msg
    });
  }

  if(!msg.discordobj) Commands.forEach((commands, lang)=> {
    const userFunc = commands[0].get(msg.content.slice(1).split(/\s/)[0]);
    if(userFunc) {
      if(user) userFunc.call(null, msg, user, lang);
      else msg.replyText(Bundle.find(lang as Assets.bundle.language, "account.account_notLogin"));
    }
  });

  if (user&&user.status.callback && user.status.name == "selecting") 
    user.status.callback(msg, user);
  else if(!msg.discordobj)
    Commands.forEach((commands, lang)=> commands[1].get(msg.content.slice(1).split(/\s/)[0])?.call(null, msg, users, lang));  

  save();
}

init();
export { Commands };
export default onMessage;