import Random from 'random';
import { CommandInteraction } from 'discord.js';
import { Mathf } from '@RTTRPG/util';
import { bundle } from '@RTTRPG/assets';
import { User, UnitEntity, findMessage } from '@RTTRPG/game';
import { BattleManager, ExchangeManager, SelectManager } from '@RTTRPG/game/managers';

export default class EncounterManager extends SelectManager {
  private target: UnitEntity;

  public constructor(user: User, interaction: CommandInteraction, target: UnitEntity, builder = findMessage(interaction.id).builder, last?: SelectManager) {
    super(user, interaction, builder);
		this.target = target;
    if(new.target === EncounterManager) this.init();
	}

  protected override init() {
    this.addButtonSelection('battle', 0, (user) => new BattleManager(user, this.interaction, this.target, this.builder));
    this.addButtonSelection('run', 0, (user) => {
      if (Random.boolean()) {
        const money = Math.floor(Mathf.range(2, 10));
        user.money -= money;
        this.builder.addFields({name: "Result:", value: "```\n"+bundle.format(user.locale, 'event.goblin_run_failed', money)+"\n```"});
      } else {
        this.builder.addFields({name: "Result:", value: "```\n"+bundle.find(user.locale, 'event.goblin_run_success')+"\n```"});
      }
      this.builder.setComponents([]);
    });

    if(this.target.id == 1) { 
      this.addButtonSelection('talking', 0, (user) => {
        const money = Math.floor(Mathf.range(2, 5));
        user.money -= money;
        this.builder.addFields({name: "Result:", value: "```\n"+bundle.format(user.locale, 'event.goblin_talking', money)+"\n```"});
        this.builder.setComponents([]);
      });
      this.addButtonSelection('exchange', 0, (user) => new ExchangeManager(user, this.interaction, this.target, this.builder));
    }
  }

  public override start() {
    this.builder.setTitle(bundle.find(this.locale, `event.${this.target.getUnit().name}`));
    super.start();
  }
}