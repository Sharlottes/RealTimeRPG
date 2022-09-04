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
  private user: User;
  private mainEmbed: MessageEmbed;

  public constructor(options: ManagerConstructOptions & { user: User, target: UnitEntity, last?: SelectManager }) {
    super(options);
    this.user = options.user;
		this.target = options.target;
    this.mainEmbed = new MessageEmbed().setTitle(bundle.find(this.locale, `event.${this.target.getUnit().name}`));
  }

  public override init() {
    this.setEmbeds([this.mainEmbed]);

    this.addButtonSelection('battle', 0, async () => {
      BattleManager.start<typeof BattleManager>({ user: this.user, interaction: this.interaction, enemy: this.target });
    });

    this.addButtonSelection('run', 0, () => {
      if (Random.boolean()) {
        const money = Math.floor(Mathf.range(2, 10));
        this.user.money -= money;
        this.mainEmbed.addFields({name: "Result:", value: "```\n"+bundle.format(this.user.locale, 'event.goblin_run_failed', money)+"\n```"});
      } else {
        this.mainEmbed.addFields({name: "Result:", value: "```\n"+bundle.find(this.user.locale, 'event.goblin_run_success')+"\n```"});
      }
      this.setComponents([]);
      this.send();
      this.user.gameManager.endEvent();
    });

    if(this.target.id == 1) { 
      this.addButtonSelection('talking', 0, () => {
        const money = Math.floor(Mathf.range(2, 5));
        this.user.money -= money;
        this.mainEmbed.addFields({name: "Result:", value: "```\n"+bundle.format(this.user.locale, 'event.goblin_talking', money)+"\n```"});
        this.setComponents([]);
        this.send();
        this.user.gameManager.endEvent();
      });
      this.addButtonSelection('exchange', 0, () => ExchangeManager.start<typeof ExchangeManager>({ user: this.user, interaction: this.interaction, target: this.target }));
    }
  }
}