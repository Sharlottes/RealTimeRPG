import Random from "random";
import { getOne } from "@/utils/getOne";
import EncounterManager from "../managers/EncounterManager";
import UnitEntity from "../UnitEntity";
import Items from "./Items";
import Units from "./Units";
import Event from "./types/BaseEvent";
import PickupManager from "@/game/managers/PickupManager";
import { ItemStack } from "@/game/Inventory";

export default class Events {
  static readonly events: Event[] = [];

  public static init() {
    this.events.length = 0;

    this.events.push(
      new Event(40, async (user, interaction) => {
        const bool = Random.bool();
        const stack = bool
          ? new ItemStack(getOne(Items.items.filter((i) => i.dropOnWalk)), Random.integer(1, 5))
          : undefined;
        const money = !bool ? 2 + Math.floor(Math.random() * 10) : undefined;

        await new PickupManager({ user, interaction, stack, money }).send(user.gameManager!.targetChannel);
      }),
    );

    this.events.push(
      new Event(10, async (user, interaction) => {
        await new EncounterManager({
          user,
          interaction,
          target: new UnitEntity(Units.find(Random.int(0, Units.units.length - 1))),
        }).send(user.gameManager!.targetChannel);
      }).setOnly(true),
    );
  }
}
