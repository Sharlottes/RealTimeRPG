import {
  APIApplicationCommandOptionChoice,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PublicThreadChannel,
  TextChannel,
} from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";

import { ItemStack, User } from "game";
import { Items, Units, Content } from "game/contents";
import { bundle } from "assets";
import { Arrays } from "utils";
import CM from "commands";
import Vars from "Vars";
import Manager from "./Manager";
import GameManager from "game/managers/GameManager";

function registerCmd(
  builder: SlashCommandBuilder,
  callback: (user: User, interaction: ChatInputCommandInteraction) => void,
  category: CommandCategory = "guild"
) {
  CM.register({
    category: category,
    dmOnly: false,
    debug: false,
    builder,
    setHiddenConfig: (arg) => arg,
    run: (interaction) => {
      //유저 호출/생성
      const user =
        Vars.users.find((u) => u.id == interaction.user.id) ||
        Vars.users[Vars.users.push(new User(interaction.user)) - 1];
      user.updateData(interaction);

      //명령어 호출
      callback(user, interaction);
    },
  });
}

namespace CommandManager {
  export function init() {
    registerCmd(
      new SlashCommandBuilder()
        .addChannelOption((options) =>
          options
            .setName("target")
            .setDescription("target channel to create game embeds")
            .addChannelTypes(ChannelType.PublicThread)
            .setRequired(false)
        )
        .setName("start")
        .setDescription("start the game"),
      async (user, interaction) => {
        if (user.gameManager) {
          Manager.newErrorEmbed(
            interaction,
            bundle.find(interaction.locale, "error.GMexist"),
            true
          );
          return;
        }
        const channel = (await (async () => {
          const channel = interaction.options.getChannel("target", false);
          if (channel) return channel;
          if (interaction.channel instanceof TextChannel)
            return await interaction.channel.threads.create({
              name: `${user.name}'s playground`,
              type: ChannelType.PublicThread,
            });
          throw new Error("interaction has no channel");
        })()) as PublicThreadChannel;
        user.gameManager = new GameManager(user, channel, { interaction });
        await user.gameManager.update();
      }
    );

    registerCmd(
      new SlashCommandBuilder()
        .addUserOption((option) =>
          option.setName("target").setDescription("target user")
        )
        .setName("status")
        .setDescription("show your own status"),
      async (user, interaction) => {
        const target = interaction.options.getUser("target", false);
        if (target) {
          const found = Vars.users.find((user) => user.id == target.id);
          if (found) {
            found.user ??= target;
            await found.showUserInfo(interaction).update();
          } else {
            Manager.newErrorEmbed(
              interaction,
              bundle.format(
                interaction.locale,
                "error.notFound",
                target.username
              )
            );
          }
        } else await user.showUserInfo(interaction).update();
      }
    );

    registerCmd(
      new SlashCommandBuilder()
        .addUserOption((option) =>
          option.setName("target").setDescription("target user")
        )
        .setName("inventory")
        .setDescription("show your own inventory"),
      async (user, interaction) => {
        const target = interaction.options.getUser("target", false);
        if (target) {
          const found = Vars.users.find((user) => user.user.id == target.id);
          if (found) await found.showInventoryInfo(interaction).update();
          else
            Manager.newErrorEmbed(
              interaction,
              bundle.format(
                interaction.locale,
                "error.notFound",
                target.username
              )
            );
        } else await user.showInventoryInfo(interaction).update();
      }
    );

    registerCmd(
      new SlashCommandBuilder()
        .addIntegerOption((option) =>
          option
            .setName("target")
            .setDescription("item name")
            .setRequired(true)
            .addChoices(
              ...Items.items.reduce<
                APIApplicationCommandOptionChoice<number>[]
              >(
                (a, i) =>
                  i.hasConsume() ? [...a, { name: i.name, value: i.id }] : a,
                []
              )
            )
        )
        .addIntegerOption((option) =>
          option.setName("amount").setDescription("item amount")
        )
        .setName("consume")
        .setDescription("consume item"),
      (user, interaction) => {
        const id = interaction.options.getInteger("target", true);
        const amount = interaction.options.getInteger("amount", false) ?? 1;
        const stack = user.inventory.items.find((i) => i.item.id == id);

        if (!stack) {
          Manager.newErrorEmbed(
            interaction,
            bundle.format(
              user.locale,
              "error.missing_item",
              Items.find(id).localName(user)
            )
          );
        } else if ((stack instanceof ItemStack ? stack.amount : 1) < amount) {
          Manager.newErrorEmbed(
            interaction,
            bundle.format(
              user.locale,
              "error.not_enough",
              stack.item.localName(user),
              amount
            )
          );
        } else {
          const potion = stack.item;
          const cons = potion.getConsume();

          user.inventory.remove(potion, amount);
          cons.consume(user, amount);
          Manager.newTextEmbed(
            interaction,
            bundle.format(
              user.locale,
              "consume",
              potion.localName(user),
              amount,
              cons.buffes
                .map((b) => b.description(user, amount, b, user.locale))
                .join("\n  ")
            )
          );
        }
      }
    );

    registerCmd(
      new SlashCommandBuilder()
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("the content type")
            .addChoices(
              { name: "item", value: "item" },
              { name: "unit", value: "unit" }
            )
        )
        .setName("info")
        .setDescription("show content information"),
      (user, interaction) => {
        const type = interaction.options.getString("type", false);
        const contents: Content[] = [];
        const embeds: EmbedBuilder[] = [];

        if (type === null || type == "unit") {
          for (const unit of Units.units) {
            if (!user.foundContents.units.includes(unit.id)) continue;
            contents.push(unit);
          }
        }

        if (type === null || type == "item") {
          for (const item of Items.items) {
            if (!user.foundContents.items.includes(item.id)) continue;
            contents.push(item);
          }
        }

        Arrays.division(contents, 5).forEach((conts) => {
          const embed = new EmbedBuilder();
          conts.forEach((cont) =>
            embed.addFields({
              name: cont.localName(user),
              value:
                cont.description(user) + "\n\n" + (cont.details(user) || ""),
            })
          );
          embeds.push(embed);
        });
        if (embeds.length <= 0)
          embeds.push(new EmbedBuilder().setDescription("< empty >"));
        //TODO: make page
        /*
				Manager.start({
					interaction: interaction, 
					embeds: [new EmbedBuilder()]
				});
				*/
      }
    );

    registerCmd(
      new SlashCommandBuilder()
        .setName("intro")
        .setDescription("introduce bot info(WIP)"),
      (user, interaction) => {
        interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Real Time Text RPG")
              .setDescription(bundle.find(user.locale, "bot.description"))
              .addFields({
                name: "GOAL",
                value: bundle.find(user.locale, "bot.goal"),
              }),
          ],
        });
      }
    );
  }
}

export default CommandManager;
