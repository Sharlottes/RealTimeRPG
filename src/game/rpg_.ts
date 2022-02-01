import { SlashCommandBuilder } from "@discordjs/builders"
import Discord, { CacheType, CommandInteraction, MessageActionRow, MessageActionRowComponent, MessageButton, MessageEmbed, MessageSelectMenu } from "discord.js";

import { UserSecure } from "../modules";
import { Utils } from "../util";
import { Entity, Contents } from ".";
import Assets from "../assets";
import { Message } from "..";
import { BaseEvent, Event, EventSelection, SelectEvent } from "../event";

import CM from "../commands";
import { ITrigger } from 'discord.js-pages';
import { CommandCategory } from '../commands/Command';

type User = UserSecure.User;
type Unit = Contents.Unit;
type Item = Contents.Item;
type UnitEntity = Entity.UnitEntity;
type ItemStack = Contents.ItemStack;

const Bundle = Assets.bundle;
const ItemStack = Contents.ItemStack;
const UnitEntity = Entity.UnitEntity;
const Mathf = Utils.Mathf;
const Database = Utils.Database;
const prefix: string = "/";
const latestMsgs: LatestMsg[] = [];
const Commands: Map<Assets.bundle.language, Map<string, Function>[]> = new Map();
const rooms: string[] = ["Sharlotted Bot Test"]

let users: UserSecure.User[] = read();

type LatestMsg = {
  id: string,
  msg: Message
};

function statusCmd(msg: Message, user: User, lang: Assets.bundle.language) {
  var targetid = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('target', false);
  var target = targetid?users.find((u) => u.id == targetid):user;
  if(targetid&&!target) 
    return msg.interaction.followUp(Bundle.format(lang, "account.account_notFound", targetid));
  msg.interaction.followUp(getUserInfo(target as User));
};

function inventoryCmd(msg: Message, user: User, lang: Assets.bundle.language) {
  var targetid = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('target', false);
  var target = targetid?users.find((u) => u.id == targetid):user;
  if(targetid&&!target) 
    return msg.interaction.followUp(Bundle.format(lang, "account.account_notFound", targetid));
  msg.interaction.followUp(getInventory(target as User));
};

function consumeCmd(msg: Message, user: User, lang: Assets.bundle.language) {
  let name = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('target', true);
  if (!name) return msg.interaction.followUp(prefix+Bundle.find(lang, "command.consume_help"));
  
  let stack: ItemStack | undefined = user.inventory.items.find(i=>ItemStack.getItem(i).localName(user)==name);
  if (!stack) return msg.interaction.followUp(Bundle.format(lang, "account.notFound", name));
  let result = ItemStack.consume(stack, user);
  if(result) msg.interaction.followUp(result);
  save();
};
/*
function contentInfoCmd(msg: Message, user: User, lang: Assets.bundle.language) {
  msg.interaction.followUp(getContentInfo(user, msg) as string);
};
*/
function weaponChangeCmd(msg: Message, user: User, lang: Assets.bundle.language) {
  let weapon = (msg.interaction as Discord.CommandInteraction<CacheType>).options.getString('target', true);
  if (!weapon) msg.interaction.followUp(prefix+Bundle.find(lang, "command.swap_help"));
  else switchWeapon(user, msg, weapon);
};

function walkingCmd(msg: Message, user: User, lang: Assets.bundle.language) {
  if(user.status.name == "selecting") return (msg.interaction as Discord.CommandInteraction<CacheType>)?.followUp("you cannot walk while selecting!");
  if (user.stats.energy < 7) {
    if (user.countover >= 3) {
      msg.interaction.followUp(Bundle.find(lang, "calmdown"));
    } else {
      user.countover++;
      msg.interaction.followUp(Bundle.format(lang, "notEnergy", user.stats.energy.toFixed(1), 7));
    }
  } else {
    user.countover = 0;
    search(msg, user);
  }
  save();
};

function registerCmd(builder: SlashCommandBuilder, callback: Function, requireUser: boolean = true, dmOnly: boolean = false, cate: CommandCategory = "guild") {
  CM.register({
    category: cate,
    dmOnly: dmOnly&&false,
    debug: false,
    run: interaction => {
      let user = users.find((u) => u.hash == parseInt(interaction.user.id));
      if(requireUser&&!user) 
        interaction.followUp(Bundle.find((interaction.locale as Assets.bundle.language) || "en", "account.account_notLogin"));
      else callback({
        interaction: interaction,
        sender: {
            name: interaction.user.username,
            hash: interaction.user.id
        },
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
    user.inventory.items.forEach((entity,i)=>{
      const exist = user.inventory.items.find(e=>e!=entity&&e.id==entity.id);
      if(exist) {
        exist.amount+=entity.amount;
        user.inventory.items.splice(i,1);
      }
    });
  });
  Contents.Items.init();
  Contents.Units.init();

  registerCmd(new SlashCommandBuilder().setName("reset").setDescription("remove current selection so that you can do walk"), (msg: Message, user: User, lang: Assets.bundle.language)=> {
    user.status.clearSelection();
    msg.interaction.followUp("selection is removed successfully!");
  });
  registerCmd((()=>{
    var s = new SlashCommandBuilder().setName("status").setDescription("show your or someone's own status");
    s.addStringOption(option => {
      option.setName("target").setDescription("target user id");
      if(users.length<=25) option.addChoices(users.map(u=>[u.id, u.id]));

      return option;
    });
    return s;
  })(), statusCmd);
  registerCmd((()=>{
    var s = new SlashCommandBuilder().setName("inventory").setDescription("show your or someone's own inventory");
    s.addStringOption(option => {
      option.setName("target").setDescription("target user id");
      if(users.length<=25) option.addChoices(users.map(u=>[u.id, u.id]));

      return option;
    });
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
  registerCmd(new SlashCommandBuilder().setName("accounts").setDescription("show all accounts"), (msg: Message)=>msg.interaction.followUp(users.map((u) => u.id).join(" | ")));
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
  save();
}

const battleSelection: EventSelection[] = [
  {
    name: "attack", 
    callback: (user, msg) => {
      if(!user.enemy || !msg.builder) return;

      const target = user.enemy;
      const weapon: Contents.Weapon = ItemStack.getItem(user.inventory.weapon);

      if (user.cooldown > 0) {
        var logs = (user.battleLog.length>=4 && !user.allLog) ? user.battleLog.slice(Math.max(0, user.battleLog.length-5), user.battleLog.length) : user.battleLog;
        user.battleLog.push("```diff\n+ "+Bundle.format(user.lang, "battle.cooldown", user.cooldown.toFixed(2))+"\n```");
        msg.builder.setDescription(Bundle.format(user.lang, "battle.start", user.id, Contents.Units.find(user.enemy.id).localName(user))+"\n"+logs.join(""));
      }
      else { 
        //쿨다운 끝나면 공격
          var logs = (user.battleLog.length>=4 && !user.allLog) ? user.battleLog.slice(Math.max(0, user.battleLog.length-5), user.battleLog.length) : user.battleLog;
          user.battleLog.push("```diff\n+ "+weapon.attack(user, target)+"\n```");
          msg.builder.setDescription(Bundle.format(user.lang, "battle.start", user.id, Contents.Units.find(user.enemy.id).localName(user))+"\n"+logs.join(""));

        //내구도 감소, 만약 내구도가 없거나 0 이하로 내려가면 주먹으로 교체.
        if(user.inventory.weapon.durability) user.inventory.weapon.durability--;
        if ((!user.inventory.weapon.durability || user.inventory.weapon.durability <= 0) && user.inventory.weapon.id !== 5) {
          var logs = (user.battleLog.length>=4 && !user.allLog) ? user.battleLog.slice(Math.max(0, user.battleLog.length-5), user.battleLog.length) : user.battleLog;
          user.battleLog.push("```diff\n+ "+Bundle.format(user.lang, "battle.broken", weapon.localName(user))+"\n```");
          msg.builder.setDescription(Bundle.format(user.lang, "battle.start", user.id, Contents.Units.find(user.enemy.id).localName(user))+"\n"+logs.join(""));
          user.inventory.weapon.id = 5;
        }

        //적이 죽으면 전투 끝, true리턴
        if (target.health <= 0) {
          if(msg.builder) {
           var logs = (user.battleLog.length>=4 && !user.allLog) ? user.battleLog.slice(Math.max(0, user.battleLog.length-5), user.battleLog.length) : user.battleLog;
            user.battleLog.push("```diff\n+ "+(target.health < 0 ? Bundle.find(user.lang, "battle.overkill") + " " : "") + Bundle.format(user.lang, "battle.win", target.health.toFixed(2))+"\n```\n```ini\n["+battlewin(user, Contents.Units.find(target.id))+"]```");
            msg.builder.setDgescription(Bundle.format(user.lang, "battle.start", user.id, Contents.Units.find(user.enemy.id).localName(user))+"\n"+logs.join(""));
          }
          msg.interaction.editReply({embeds: [msg.builder], components: []});
          user.enemy = undefined;
          msg.builder = null;
          user.battleLog = [];
          user.status.clearSelection();
        };
      }
    }
  },
  {
    name: "show-logs", 
    callback: (user, msg, button) => {
      user.allLog = true;
      if(button) {
        button.components[1].setDisabled(true);
        button.components[2].setDisabled(false);
        msg.interaction.editReply({components: [button]});
      }
    },
    style: `SECONDARY`
  },
  {
    name: "hide-logs", 
    callback: (user, msg, button) => {
      user.allLog = false;
      if(button) {
        button.components[1].setDisabled(false);
        button.components[2].setDisabled(true);
        msg.interaction.editReply({components: [button]});
      }
    },
    style: `SECONDARY`
  }
];

function exchange(msg: Message, user: User, entity: UnitEntity) {
  for (let i = 0; i < 20; i++) {
    const item = getOne(Contents.Items.getItems().filter((i) => i.dropableOnShop()&&i.id!==5), "rare");
    const exist = entity.items.items.find((e) => e.id == item.id);
    if (exist) exist.amount++;
    else entity.items.items.push(new ItemStack(item.id,1,item.durability));
  }
  
  user.enemy = entity;

  if(msg.builder){
    const buttons: MessageActionRow = new MessageActionRow();
    const triggers: ITrigger<MessageActionRowComponent>[] = [];

    exchangeSelection.forEach((select, i) => {
        const name = Assets.bundle.find(user.lang, `select.${select.name}`);
        buttons.addComponents(new MessageButton().setCustomId(name+i).setLabel(name).setStyle('PRIMARY'));
        triggers.push({
            name: name+i,
            callback: (interactionCallback, button)=> {
                buttons.components.forEach(c=>c.setDisabled(true));
                select.callback(user, msg);
            }
        });
    });

    msg.builder
      .setDescription(Bundle.find(user.lang, "event.goblin_exchange"))
      .setComponents(buttons).setTriggers(triggers);
    msg.interaction.editReply({embeds: [msg.builder], components: [buttons]})
  }
};

function battle(msg: Message, user: User, entity: UnitEntity) {
  const buttons: MessageActionRow = new MessageActionRow();
  user.enemy = entity;

  if(msg.builder){
    const triggers: ITrigger<MessageActionRowComponent>[] = [];

    battleSelection.forEach((select, i) => {
        const name = Assets.bundle.find(user.lang, `select.${select.name}`);
        buttons.addComponents(new MessageButton().setCustomId(name+i).setLabel(name).setStyle('PRIMARY'));
        triggers.push({
            name: name+i,
            callback: ()=> select.callback(user, msg)
        });
    });

    msg.builder
      .setDescription(Bundle.format(user.lang, "battle.start", user.id, Contents.Units.find(entity.id).localName(user)))
      .setComponents(buttons).setTriggers(triggers);
    msg.interaction.editReply({embeds: [msg.builder], components: [buttons]})
  }
  
  if(Contents.Items.find(entity.items.weapon.id)) {
    const interval: NodeJS.Timeout = setInterval(entity => {
      if(!msg.builder) return clearInterval(interval);

      entity.cooldown -= 100 / 1000
      if (entity.cooldown <= 0) {
        entity.cooldown = (Contents.Items.find(entity.items.weapon.id) as Contents.Weapon).cooldown;
        var logs = (user.battleLog.length>=4 && !user.allLog) ? user.battleLog.slice(Math.max(0, user.battleLog.length-5), user.battleLog.length) : user.battleLog;
        user.battleLog.push("```diff\n- "+(Contents.Items.find(entity.items.weapon.id) as Contents.Weapon).attackEntity(user)+"\n```");
        msg.builder.setDescription(Bundle.format(user.lang, "battle.start", user.id, Contents.Units.find(entity.id).localName(user))+"\n"+logs.join(""));
        msg.interaction.editReply({embeds: [msg.builder]}); //다른 스레드에서 실행되니 임베드를 업데이트
      };
    
      if (user.stats.health <= 0 || !user.enemy) {
        if(user.stats.health <= 0) {
          var logs = (user.battleLog.length>=4 && !user.allLog) ? user.battleLog.slice(Math.max(0, user.battleLog.length-5), user.battleLog.length) : user.battleLog;
          user.battleLog.push("```diff\n- "+Bundle.format(user.lang, "battle.lose", user.stats.health.toFixed(2))+"\n```");
          msg.builder.setDescription(Bundle.format(user.lang, "battle.start", user.id, Contents.Units.find(entity.id).localName(user))+"\n"+logs.join(""));
          user.stats.health = 0.1 * user.stats.health_max;
        }
        clearInterval(interval);
      }
    }, 100, entity);
  }
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
    user.exp, (user.exp += unit.level * (1 + unit.rare) * 10),
    items.map((i) => `${i.item.localName(user)} +${i.amount} ${Bundle.find(user.lang, "unit.item")}`).join("\n")) 
    + "\n" + items.map((i) => giveItem(user, i.item)).filter(e=>e).join("\n");
  save();
  return str;
}

export function giveItem(user: User, item: Item, amount: number=1): string | null {
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
  {
    name: "buy", 
    callback: (user, msg) => {
      if(!user.enemy) return;

      const out = []; //1열에 버튼 4개씩
      for(var i = 0; i < Math.floor(user.enemy.items.items.length/4); i++){
        out.push(user.enemy.items.items.slice(i*4,Math.min(user.enemy.items.items.length, (i+1)*4)));  
      };

      const triggers: ITrigger<MessageActionRowComponent>[] = [];
      const buttons = out.map((items,ii)=>new MessageActionRow().setComponents((items.map((entity,i)=>{
        const ent = user.enemy?.items.items.find(e=>e.id==entity.id);
        if(!ent) return;

        const item = ItemStack.getItem(ent);
        const money = item.cost * 25;
        
        triggers.push({
          name: `${item.localName(user)}${i}${ii}`,
          callback(interactionCallback, button) {
            buttons.slice(0, Math.min(buttons.length-1, buttons.length-2)).forEach(b=>b.components.forEach(bb=>bb.setDisabled(true)));
            buttons[buttons.length-1].components.forEach(b=>b.setDisabled(false));
            user.status.callback = (amount: number) => {
              if(!user.enemy) return;
              
              buttons.slice(0, Math.min(buttons.length - 1, buttons.length - 2)).forEach(b => b.components.forEach(bb => bb.setDisabled(false)));
              buttons[buttons.length - 1].components.forEach(b => b.setDisabled(true));
              user.status.callback = undefined;
              if (amount > ent.amount)
                msg.builder?.setDescription(msg.builder.description+"```diff\n- "+Bundle.format(user.lang, "shop.notEnough_item", item.localName(user), amount, ent.amount)+"```");
              else if (user.money < amount * money)
                msg.builder?.setDescription(msg.builder.description+"```diff\n- "+Bundle.format(user.lang, "shop.notEnough_money", amount * money, user.money)+"```");
              else {
                msg.builder?.setDescription(msg.builder.description+"```diff\n+ "+Bundle.format(user.lang, "shop.buyed", item.localName(user), amount, user.money, (user.money -= money * amount))+"```");
                ent.amount -= amount;
                (button.setCustomId(`${item.localName(user)}${i}${ii}`) as Discord.MessageButton).setLabel(`${item.localName(user)}: ${money+Bundle.format(user.lang, "unit.money")} (${ent.amount+Bundle.format(user.lang, "unit.item")} ${Bundle.format(user.lang, "unit.item_left")})`).setStyle('PRIMARY');
      
                const isNew = giveItem(user, item, amount);
                if(isNew) msg.builder?.setDescription(msg.builder.description+"```diff\n+ "+isNew+"```");
                if (!ent.amount) user.enemy.items.items.splice(i, 1);
                save();
              }

              if(msg.builder) msg.interaction.editReply({components: buttons, embeds: [msg.builder]});
            }
          }
        });
        return new MessageButton().setCustomId(`${item.localName(user)}${i}${ii}`).setLabel(`${item.localName(user)}: ${money+Bundle.format(user.lang, "unit.money")} (${ent.amount+Bundle.format(user.lang, "unit.item")} ${Bundle.format(user.lang, "unit.item_left")})`).setStyle('PRIMARY');
      }) as any[]).filter(e=>e)));
      msg.builder?.setComponents(buttons).setTriggers(triggers)
        .addComponents(new MessageActionRow().setComponents(new MessageButton().setCustomId("backkk").setLabel(`back`).setStyle(`SECONDARY`)))
        .addTriggers({
          name: "backkk",
          callback(interactionCallback, button) {
            if(msg.builder){
              const buttons = new MessageActionRow();
              const triggers: ITrigger<MessageActionRowComponent>[] = [];
              exchangeSelection.forEach((select, i)=>{
                const name = Assets.bundle.find(user.lang, `select.${select.name}`);
                buttons.addComponents(new MessageButton().setCustomId(name+i).setLabel(name).setStyle('PRIMARY'));
                triggers.push({
                  name: name+i,
                  callback: () => select.callback(user, msg)
                });
              });

              msg.builder
                .setDescription(Bundle.find(user.lang, "event.goblin_exchange"))
                .setComponents(buttons).setTriggers(triggers);
              msg.interaction.editReply({embeds: [msg.builder], components: [buttons]});
            }
          }
        })
        .addComponents(new MessageSelectMenu().setCustomId(`selectBuy`).setPlaceholder("1 items").addOptions(new Array(10).fill(0).map((e,i)=>{
          return {
            label: `${i+1} items`,
            value: `${i+1}`
          };
        })).setDisabled(true)).addTriggers({
          name: "selectBuy",
          callback(interactionCallback, select) {
              if(interactionCallback.isSelectMenu()) user.status.callback?.call(null, Number(interactionCallback.values[0]));
          }
        });
    }
  },
  {
    name: "sell",
    callback: (user, msg) => {
    const out = []; //1열에 버튼 4개씩
    for(var i = 0; i < Math.floor(user.inventory.items.length/4); i++){
      out.push(user.inventory.items.slice(i*4,Math.min(user.inventory.items.length, (i+1)*4)));  
    };

    const triggers: ITrigger<MessageActionRowComponent>[] = [];
    const buttons = out.map((items,ii)=>new MessageActionRow().setComponents((items.map((entity,i)=>{
      const ent = user.inventory.items.find(e=>e.id==entity.id);
      if(!ent) return;

      const item = ItemStack.getItem(ent);
      const money = item.cost * 10;
      
      triggers.push({
        name: `${item.localName(user)}${i}${ii}`,
        callback(interactionCallback, button) {
          buttons.slice(0,Math.min(buttons.length-1, buttons.length-2)).forEach(b=>b.components.forEach(bb=>bb.setDisabled(true)));
          buttons[buttons.length-1].components.forEach(b=>b.setDisabled(false));

          user.status.callback = (amount: number) => {
            buttons.slice(0, Math.min(buttons.length - 1, buttons.length - 2)).forEach(b => b.components.forEach(bb => bb.setDisabled(false)));
            buttons[buttons.length - 1].components.forEach(b => b.setDisabled(true));
            user.status.callback = undefined;
            
            if (amount > ent.amount)
              msg.builder?.setDescription(msg.builder.description+"```diff\n- "+Bundle.format(user.lang, "shop.notEnough_item", item.localName(user), amount, ent.amount)+"```");
            else if (user.money < amount * money)
              msg.builder?.setDescription(msg.builder.description+"```diff\n- "+Bundle.format(user.lang, "shop.notEnough_money", amount * money, user.money)+"```");
            else {
              msg.builder?.setDescription(msg.builder.description+"```diff\n+ "+Bundle.format(user.lang, "shop.sold", item.localName(user), amount, user.money, (user.money += money * amount))+"```");
              ent.amount -= amount;
              if (!ent.amount) user.inventory.items.splice(i, 1);
              (button.setCustomId(`${item.localName(user)}${i}${ii}`) as Discord.MessageButton).setLabel(`${item.localName(user)}: ${money+Bundle.format(user.lang, "unit.money")} (${ent.amount+Bundle.format(user.lang, "unit.item")} ${Bundle.format(user.lang, "unit.item_left")})`).setStyle('PRIMARY');
              save();
            }
            
            if(msg.builder) msg.interaction.editReply({components: buttons, embeds: [msg.builder]});
          }
        }
      });
      return new MessageButton().setCustomId(`${item.localName(user)}${i}${ii}`).setLabel(`${item.localName(user)}: ${money+Bundle.format(user.lang, "unit.money")} (${ent.amount+Bundle.format(user.lang, "unit.item")} ${Bundle.format(user.lang, "unit.item_left")})`).setStyle('PRIMARY');
    }) as any[]).filter(e=>e)));
    msg.builder?.setComponents(buttons).setTriggers(triggers)
      .addComponents(new MessageActionRow().setComponents(new MessageButton().setCustomId("backkk").setLabel(`back`).setStyle(`SECONDARY`)))
      .addTriggers({
        name: "backkk",
        callback(interactionCallback, button) {
          if(msg.builder){
            const buttons = new MessageActionRow();
            const triggers: ITrigger<MessageActionRowComponent>[] = [];
            exchangeSelection.forEach((select, i)=>{
              const name = Assets.bundle.find(user.lang, `select.${select.name}`);
              buttons.addComponents(new MessageButton().setCustomId(name+i).setLabel(name).setStyle('PRIMARY'));
              triggers.push({
                name: name+i,
                callback: () => select.callback(user, msg)
              });
            });

            msg.builder
              .setDescription(Bundle.find(user.lang, "event.goblin_exchange"))
              .setComponents(buttons).setTriggers(triggers);
            msg.interaction.editReply({embeds: [msg.builder], components: [buttons]});
          }
        }
      })
      .addComponents(new MessageSelectMenu().setCustomId(`selectSell`).setPlaceholder("1 items").addOptions(new Array(10).fill(0).map((e,i)=>{
        return {
          label: `${i+1} items`,
          value: `${i+1}`
        };
      })).setDisabled(true)).addTriggers({
        name: "selectSell",
        callback(interactionCallback, select) {
          if(interactionCallback.isSelectMenu()) user.status.callback?.call(null, Number(interactionCallback.values[0]));
        }
      });
    }
  },
  {
    name: "back", 
    callback: (user, msg) => {
      if(msg.builder) {
        msg.builder.setDescription(msg.builder.description+"\n```\n"+Bundle.find(user.lang, "shop.end")+"\n```");
        msg.interaction.editReply({embeds: [msg.builder], components: []});
      }
      user.status.clearSelection();
      user.enemy = undefined;
      msg.builder = null;
    }
  }
];


const eventData: Event[] = [
  new BaseEvent(5, "battle.ignore"),
  new BaseEvent(15, "", (user, msg)=> {
    let money = 2 + Math.floor(Math.random() * 10);
    user.money += money;
    msg.interaction.followUp(Bundle.format(user.lang, "event.money", money));
  }),
  
  new BaseEvent(25, "", (user, msg)=> {
    const item = getOne(Contents.Items.getItems().filter((i) => i.dropableOnWalking()), "rare");
    msg.interaction.followUp(Bundle.format(user.lang, "event.item", item.localName(user)) + (giveItem(user, item)||""));
  }),
  new SelectEvent(10, "event.goblin",
    [
      {
        name: "run", 
        callback: (user, msg) => {
          if (Mathf.randbool()) {
            let money = Math.floor(Mathf.range(2, 10));
            user.money -= money;
            msg.interaction.followUp(Bundle.format(user.lang, "event.goblin_run_failed", money));
          } else {
            msg.interaction.followUp(Bundle.find(user.lang, "event.goblin_run_success"));
          }
          user.status.clearSelection();
        }
      },
      {
        name: "talking",
        callback: (user, msg) => {
          let money = Math.floor(Mathf.range(2, 5));
          user.money -= money;
          msg.interaction.followUp(Bundle.format(user.lang, "event.goblin_talking", money));
          user.status.clearSelection();
        }
      },
      {
        name: "exchange",
        callback: (user, msg) => {
          exchange(msg, user, new UnitEntity(Contents.Units.find(1)));
        }
      }
    ]
  ),
  new SelectEvent(22220, "event.obstruction",
    [ 
      {
        name: "battle",
        callback: (user, msg) => battle(msg, user, new UnitEntity(Contents.Units.find(0)))
      },
      {
        name: "run",
        callback: (user, msg) => {
          msg.interaction.followUp(Bundle.find(user.lang, "event.obstruction_run"));
          user.status.clearSelection();
        }
      }
    ]
  ),
];

/**
 *
 * @param {array} arr 아이템을 뽑을 아이템 배열
 * @param {string} ratio 아이템 비율 속성이름
 * @returns arr 배열의 인수 중 하나를 랜덤하게 반환
 */
export function getOne(arr: any[], ratio: string) {
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
  latestMsgs.find(u=>u.id==user.id)?.msg.interaction.followUp(str);
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
    u.stats.health = Math.min(u.stats.health_max, u.stats.health + u.stats.health_regen / 100);
  });
}, 10);

function search(msg: Message, user: User) {
  let event = getOne(eventData, "ratio");
  if (!event) return msg.interaction.followUp(Bundle.find(user.lang, "event.phytoncide"));
  event.start(user, msg);
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
/* //TODO: make content info
function getContentInfo(user: User, msg: Message) {
  const [, type] = msg.content.split(/\s/);
  if (type != "아이템" && type != "유닛")
    return msg.interaction.followUp("!도감 (아이템|유닛) [이름]");

  let str = "";
  let name = msg.content.split(/\s/).slice(2).join(" ");
  if (type == "유닛") {
    if (name && !Contents.Units.getUnits().some((u) => u.localName(user) == name))
      return msg.interaction.followUp(Strings.format("유닛 {0}(을)를 찾을 수 없습니다.", name));
    str = Strings.format("유닛\n===============\n\n{0}\n\n", [name
        ? info(user, Contents.Units.getUnits().find((u) => u.localName(user) == name) as Unit)
        : Contents.Units.getUnits().map((c) => info(user, c)).join("\n\n")
    ]);
  } else if (type == "아이템") {
    if (name && !Contents.Items.getItems().some((u) => u.localName(user) == name))
      return msg.interaction.followUp(Strings.format("아이템 {0}(을)를 찾을 수 없습니다.", name));
    str = Strings.format("아이템\n===============\n\n{0}\n\n", name 
      ? info(user,Contents.Items.getItems().find((u) => u.localName(user) == name) as Item)
      : Contents.Items.getItems().map((c) => info(user, c)).join("\n\n")
    );
  }
  return str;
}
*/

export function getUsers() {
  return users;
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
  if (!item) msg.interaction.followUp(Bundle.format(user.lang, "switch_notFound", name));
  else {
    let entity = user.inventory.items.find((entity) => ItemStack.getItem(entity) == item);
    if (!entity) msg.interaction.followUp(Bundle.format(user.lang, "switch_notHave", name));
    else {
      entity.amount--;
      if (!entity.amount) user.inventory.items.splice(user.inventory.items.indexOf(entity), 1);

      let exist: Item = ItemStack.getItem(user.inventory.weapon);
      if (exist) {
        msg.interaction.followUp(Bundle.format(user.lang, "switch_change", name, exist.localName(user)));
        const given = giveItem(user, item);
        if(given) msg.interaction.followUp(given);
      } else 
        msg.interaction.followUp(Bundle.format(user.lang, "switch_equip", name));
      
      
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
    u.battleLog = [];
    return u;
  });
}

function save() {
  checkusers();
  Database.writeObject("./Database/user_data", users);
}

init();
export { Commands };