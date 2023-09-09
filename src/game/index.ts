export { default as UnitEntity } from "./UnitEntity";
export { default as StatusEntity } from "./StatusEntity";
export { default as Inventory } from "./Inventory";
export * from "./Inventory";

import { Items, Units, StatusEffects } from "@/game/contents";
import Vars from "@/Vars";
import Events from "./contents/Events";
export { default as User } from "./User";

class Game {
  update() {
    for (const user of Vars.users) {
      user.levelup();
    }
  }

  init() {
    StatusEffects.init();
    Items.init();
    Units.init();
    Events.init();

    setInterval(() => this.update(), 1000);
  }
}

export default new Game();
