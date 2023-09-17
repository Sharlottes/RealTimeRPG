import { Discord as DiscordX, Slash, SlashChoice, SlashOption } from "discordx";
import { showInventoryInfo, showUserInfo } from "@/game/managers/managerFactory";
import { ApplicationCommandOptionType } from "discord.js";
import AlertManager from "@/game/managers/AlertManager";
import { ItemStack } from "@/game/Inventory";
import Items from "@/game/contents/Items";
import bundle from "@/assets/Bundle";
import User from "@/game/User";

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
    await showUserInfo(interaction, User.findUserByDiscordId((targetUser ?? interaction.user).id)).send();
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
    await showInventoryInfo(interaction, User.findUserByDiscordId((targetUser ?? interaction.user).id)).send();
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
      new AlertManager(
        interaction,
        "ERROR",
        bundle.format(user.locale, "error.missing_item", Items.find(itemID).localName(user)),
      ).send();
      return;
    }
    if ((stack instanceof ItemStack ? stack.amount : 1) < amount) {
      new AlertManager(
        interaction,
        "ERROR",
        bundle.format(user.locale, "error.not_enough", stack.item.localName(user), amount),
      ).send();
      return;
    }

    const potion = stack.item;
    const cons = potion.getConsume();

    user.inventory.remove(potion, amount);
    cons.consume(user, amount);
    new AlertManager(
      interaction,
      "",
      bundle.format(
        user.locale,
        "consume",
        potion.localName(user),
        amount,
        cons.buffes.map((b) => b.description(user, amount!, b, user.locale)).join("\n  "),
      ),
    ).send();
  }
}
