import { CloseButtonComponent } from "@/command/components/GeneralComponents";
import { codeBlock } from "@discordjs/builders";
import { ItemStack } from "@/game/Inventory";
import bundle from "@/assets/Bundle";
import User from "@/game/User";

import Manager from "./Manager";

class PickupManager extends Manager {
  public constructor(options: { interaction: Discord.BaseInteraction; stack?: ItemStack; money?: number; user: User }) {
    super({
      ...options,
      content: codeBlock(
        bundle.format(
          options.interaction.locale,
          "event.pickup",
          options.stack
            ? options.stack.item.localName(options.interaction.locale)
            : options.money + bundle.find(options.interaction.locale, "unit.money"),
          options.stack
            ? `${options.stack.item.localName(options.interaction.locale)}: +${options.stack.amount}${bundle.find(
                options.interaction.locale,
                "unit.item",
              )}`
            : `+${options.money}${bundle.find(options.interaction.locale, "unit.money")}`,
        ),
      ),
      components: [CloseButtonComponent.Row],
    });

    options.user.money += options.money ?? 0;
    if (options.stack) options.user.giveItem(options.stack.item, options.stack.amount);
  }
}

export default PickupManager;
