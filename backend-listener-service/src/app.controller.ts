import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { LotteryDrawService } from './lotter-draw.service';
import { MessagePattern } from "@nestjs/microservices";

@Controller()
export class AppController {

  constructor(private readonly lotteryDrawService: LotteryDrawService) {}

  @Get("/lottery-draws")
  async getLotteryDraws(@Query('page') page: string, @Query('limit') limit: string) {
    const processedPage = (page) ? Number(page) : 1;
    const processedLimit = (limit) ? Number(limit) : 1000;
    const result = await this.lotteryDrawService.findAll(processedPage, processedLimit);
    return result;
  }

  @MessagePattern("LotteryDrawRan")
  public async lotteryDrawRan(lotteryDrawEventDetails: any) {
    console.log('STARTING');
    const result = await this.lotteryDrawService.create(lotteryDrawEventDetails);
    console.log('SUCCESS');
    console.log(result);
  }

  @Get("/current-draw")
  async getCurrentDraw() {
    return this.lotteryDrawService.getCurrentDraw();
  }

  @Get("/user-tickets")
  async loadUserTickets(@Query('address') address) {
    return this.lotteryDrawService.loadUserTickets(address);
  }


  @Get("/has-winnings")
  async hasWinnings(@Query('address') address) {
    return this.lotteryDrawService.hasWinnings(address);
  }
  
  

}
