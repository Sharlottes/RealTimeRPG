import Vars from "@/Vars";

import StatusEffects from "./contents/StatusEffects";
import Events from "./contents/Events";
import Items from "./contents/Items";
import Units from "./contents/Units";

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
