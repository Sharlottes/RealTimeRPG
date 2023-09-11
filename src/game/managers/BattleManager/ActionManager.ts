import type BattleManager from "@/game/managers/BattleManager/index";
import { codeBlock, EmbedBuilder } from "discord.js";

import type { BaseAction } from "../actions/BaseAction";
import ComboManager from "./ComboManager";

class ActionManager {
  public readonly actionEmbed = new EmbedBuilder().setTitle("Action Queue").setDescription("Empty");
  private readonly actionQueue: BaseAction[] = [];

  public toString() {
    return this.actionQueue.map((a) => codeBlock(a.description())).join("") || null;
  }

  public async onTurnEnd(manager: BattleManager) {
    const actionDescriptions = this.actionQueue.map((action) => codeBlock(action.description()));
    for (const action of this.actionQueue) {
      actionDescriptions.shift();
      this.actionEmbed.setDescription(actionDescriptions.join(""));
      await manager.update();
      await action.run();
      await ComboManager.onAction(action, manager);
    }
  }

  public addAction(action: BaseAction) {
    action.added();
    this.actionQueue.push(action);
    this.actionEmbed.setDescription(this.toString());
  }

  public undoAction() {
    this.actionQueue.pop()?.undo();
    this.actionEmbed.setDescription(this.toString());
  }

  public isEmpty() {
    return this.actionQueue.length === 0;
  }
}

export default new ActionManager();
