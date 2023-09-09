import { bundle } from "@/assets";
import { ItemStack, User } from "@/game";
import { Items } from "@/game/contents";
import Manager from "@/game/managers/Manager";
import { ApplicationCommandOptionType } from "discord.js";
import { Discord as DiscordX, Slash, SlashChoice, SlashOption } from "discordx";

@DiscordX()
abstract class UserCommands {
  @Slash({
    name: "status",
    description: "show your own status",
  })
  async showUserStatus(
    @SlashOption({
      name: "target",
      description: "target user to show status",
      type: ApplicationCommandOptionType.User,
      required: false,
    })
    targetUser: Discord.User | null,
    interaction: Discord.CommandInteraction,
  ) {
    targetUser ??= interaction.user;
    const user = User.findUserByDiscordId(targetUser.id);

    console.log(user);
    if (user) {
      await user.showUserInfo(interaction).update();
    } else {
      Manager.newErrorEmbed(
        interaction,
        bundle.format(
          interaction.locale,
          "error.notFound",
          targetUser.username,
        ),
      );
    }
  }

  @Slash({
    name: "inventory",
    description: "show your own inventory",
  })
  async showUserInventory(
    @SlashOption({
      name: "target",
      description: "target user to show status",
      type: ApplicationCommandOptionType.User,
      required: false,
    })
    targetUser: Discord.User | null,
    interaction: Discord.CommandInteraction,
  ) {
    targetUser ??= interaction.user;
    const user = User.findUserByDiscordId(targetUser.id);

    if (user) {
      await user.showInventoryInfo(interaction).update();
    } else {
      Manager.newErrorEmbed(
        interaction,
        bundle.format(
          interaction.locale,
          "error.notFound",
          targetUser.username,
        ),
      );
    }
  }

  @Slash({
    name: "consume",
    description: "consume item",
  })
  async consumeItem(
    @SlashChoice(
      ...Items.items
        .filter((item) => item.hasConsume())
        .map<Discord.APIApplicationCommandOptionChoice<number>>((item) => ({
          name: item.name,
          value: item.id,
        })),
    )
    @SlashOption({
      name: "item",
      description: "the item name to consume",
      required: true,
      type: ApplicationCommandOptionType.Number,
    })
    itemID: number,
    @SlashOption({
      name: "amount",
      description: "item amount",
      required: false,
      type: ApplicationCommandOptionType.Number,
    })
    amount: number | null,
    interaction: Discord.CommandInteraction,
  ) {
    amount ??= 1;
    const user = User.findUserByInteraction(interaction);
    if (!user) return;
    const stack = user.inventory.items.find((i) => i.item.id == itemID);
    if (!stack) {
      Manager.newErrorEmbed(
        interaction,
        bundle.format(
          user.locale,
          "error.missing_item",
          Items.find(itemID).localName(user),
        ),
      );
      return;
    }
    if ((stack instanceof ItemStack ? stack.amount : 1) < amount) {
      Manager.newErrorEmbed(
        interaction,
        bundle.format(
          user.locale,
          "error.not_enough",
          stack.item.localName(user),
          amount,
        ),
      );
      return;
    }

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
          .map((b) => b.description(user, amount!, b, user.locale))
          .join("\n  "),
      ),
    );
  }
}
