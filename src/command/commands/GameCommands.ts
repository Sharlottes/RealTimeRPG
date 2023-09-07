import { bundle } from "@/assets";
import { ItemStack, User } from "@/game";
import { Content, Items, Units } from "@/game/contents";
import GameManager from "@/game/managers/GameManager";
import Manager from "@/game/managers/Manager";
import { Arrays } from "@/utils";
import {
  ApplicationCommandOptionType,
  ChannelType,
  TextChannel,
  EmbedBuilder,
} from "discord.js";
import { Discord as DiscordX, Slash, SlashChoice, SlashOption } from "discordx";

@DiscordX()
abstract class GameCommands {
  @Slash({
    name: "start",
    description: "start the game",
  })
  async startGame(
    @SlashOption({
      name: "target",
      description: "target channel to create game embeds",
      channelTypes: [ChannelType.PublicThread],
      type: ApplicationCommandOptionType.Channel,
      required: false,
    })
    channel: Discord.PublicThreadChannel | null,
    interaction: Discord.CommandInteraction
  ) {
    const user = User.findUserByInteraction(interaction);
    if (!user) return;

    if (!channel) {
      if (interaction.channel instanceof TextChannel)
        channel ??= (await interaction.channel.threads.create({
          name: `${user.name}'s playground`,
          type: ChannelType.PublicThread,
        })) as Discord.PublicThreadChannel;
      else throw new Error("interaction has no channel");
    }

    if (user.gameManager) {
      Manager.newErrorEmbed(
        interaction,
        bundle.find(interaction.locale, "error.GMexist"),
        true
      );
      return;
    }
    user.gameManager = new GameManager(user, channel, { interaction });
    await user.gameManager.update();
  }

  @Slash({
    name: "info",
    description: "show content information",
  })
  showContentInformation(
    @SlashChoice(
      { name: "item", value: "item" },
      { name: "unit", value: "unit" }
    )
    @SlashOption({
      name: "type",
      description: "the content type",
      type: ApplicationCommandOptionType.String,
      required: false,
    })
    type: "item" | "unit" | null,
    interaction: Discord.CommandInteraction
  ) {
    const user = User.findUserByInteraction(interaction);
    if (!user) return;

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
          value: cont.description(user) + "\n\n" + (cont.details(user) || ""),
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

  @Slash({
    name: "intro",
    description: "introduce bot info",
  })
  showBotInformation(interaction: Discord.CommandInteraction) {
    interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Real Time Text RPG")
          .setDescription(bundle.find(interaction.locale, "bot.description"))
          .addFields({
            name: "GOAL",
            value: bundle.find(interaction.locale, "bot.goal"),
          }),
      ],
    });
  }
}
