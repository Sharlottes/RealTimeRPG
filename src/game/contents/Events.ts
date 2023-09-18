import PickupManager from "@/game/managers/PickupManager";
import { ItemStack } from "@/game/Inventory";
import { getOne } from "@/utils/functions";
import Random from "random";

import EncounterManager from "../managers/EncounterManager";
import UnitEntity from "../UnitEntity";
import Items from "./Items";
import Units from "./Units";

export default class Events {
  static readonly events: GameEvent[] = [];

  public static init() {
    this.events.length = 0;

    this.events.push(
      {
        ratio: 40,
        start: async ({ user }, interaction) => {
          const bool = Random.bool();
          const stack = bool
            ? new ItemStack(getOne(Items.items.filter((i) => i.dropOnWalk)), Random.integer(1, 5))
            : undefined;
          const money = !bool ? 2 + Math.floor(Math.random() * 10) : undefined;

          await new PickupManager({ user, interaction, stack, money }).send();
        },
      },
      {
        only: true,
        ratio: 10,
        start: (gameManager, interaction) => {
          new EncounterManager(gameManager, {
            user: gameManager.user,
            interaction,
            target: new UnitEntity(Units.find(Random.int(0, Units.units.length - 1))),
          }).send();
        },
      },
    );
  }
}
