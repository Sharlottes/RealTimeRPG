import Random from 'random';

import BattleManager from '@RTTRPG/game/managers/BattleManager';
import ExchangeManager from '@RTTRPG/game/managers/ExchangeManager';
import SelectManager from '@RTTRPG/game/managers/SelectManager';
import { User, UnitEntity } from '@RTTRPG/game';
import { bundle } from '@RTTRPG/assets';
import { Mathf } from '@RTTRPG/util';
import { ManagerConstructOptions } from '@RTTRPG/@type';
import { MessageEmbed } from 'discord.js';

export default class EncounterManager extends SelectManager {
  private target: UnitEntity;

  public constructor(options: ManagerConstructOptions & { user: User, target: UnitEntity, last?: SelectManager }) {
    super(options);
		this.target = options.target;
    console.log(options);
	}

  public override init() {
    this.setEmbeds([new MessageEmbed().setTitle(bundle.find(this.locale, `event.${this.target.getUnit().name}`))]);

    this.addButtonSelection('battle', 0, (user) => BattleManager.start<typeof BattleManager>({ user: user, interaction: this.interaction, enemy: this.target }));
    this.addButtonSelection('run', 0, (user) => {
      if (Random.boolean()) {
        const money = Math.floor(Mathf.range(2, 10));
        user.money -= money;
        this.embeds[0].addFields({name: "Result:", value: "```\n"+bundle.format(user.locale, 'event.goblin_run_failed', money)+"\n```"});
      } else {
        this.embeds[0].addFields({name: "Result:", value: "```\n"+bundle.find(user.locale, 'event.goblin_run_success')+"\n```"});
      }
      this.setComponents([]);
    });

    if(this.target.id == 1) { 
      this.addButtonSelection('talking', 0, (user) => {
        const money = Math.floor(Mathf.range(2, 5));
        user.money -= money;
        this.embeds[0].addFields({name: "Result:", value: "```\n"+bundle.format(user.locale, 'event.goblin_talking', money)+"\n```"});
        this.setComponents([]);
      });
      this.addButtonSelection('exchange', 0, (user) => ExchangeManager.start<typeof ExchangeManager>({ user: user, interaction: this.interaction, target: this.target }));
    }
  }
}