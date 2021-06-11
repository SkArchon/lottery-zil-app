import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LotteryDrawService } from './lotter-draw.service';
import { TaskRunnerService } from './task-runner.service';

const { DateTime } = require("luxon");

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);


  constructor(private readonly lotteryDrawService: LotteryDrawService,
              private readonly taskRunnerService: TaskRunnerService) { }

  // This is low for testing, ideally should be changed to either every hour or so
  // well or even better an exact timing (but should match the actual timestamp)
  // @Cron(CronExpression.EVERY_MINUTE) 
  @Cron("0 */2 * * * *")
  private async processDraw() {
    try {
      this.logger.log("Starting draw run check");
      const startDraw = await this.isDurationPassed();

      if(startDraw) {
        this.logger.log("Running draw");

        const seed = await this.getSeed();
        const result = await this.taskRunnerService.runDraw(seed);
        this.logger.log("Running draw transaction successful :" + result);
      }
    }
    catch(e) {
      this.logger.error("An error occurred while starting the draw", e);
    }
  }

  private getRandomIntValue(max) {
    return Math.floor(Math.random() * max);
  }

  private async getSeed() {
    const usersCount = await this.lotteryDrawService.getUserCountForDraw();
    console.log("USERS : " + usersCount);
    return (this.getRandomIntValue(usersCount) + 1);

  }

  private async isDurationPassed() {
    try {
      const { timestamp } = await this.lotteryDrawService.getCurrentDraw();

      if (!timestamp) {
        this.logger.error('An error occurred when getting the timestamp');
        return false;
      }
      const drawTimestampUtc = DateTime.fromSeconds(Number(timestamp));

      const difference = drawTimestampUtc.diffNow().toObject().milliseconds;
      const result = difference < 0;
      
      this.logger.debug("Returning result " + result);
      return result;
    }
    catch(e) {
      this.logger.error("Unable to check if draw time is passed", e);
      return false;
    }
  }
    
 
}



