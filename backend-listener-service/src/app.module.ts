import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { LotteryDraw, LotteryDrawSchema } from './lottery-draw.schema';
import { LotteryDrawService } from './lotter-draw.service';
import { ScheduleModule } from '@nestjs/schedule';
import { TaskService } from './task.service';
import { AppMetadata, AppMetadataSchema } from './app-metadata.schema';
import { MONGODB_URL } from './app.constants';
import { UserTicket, UserTicketSchema } from './user-ticket.schema';
import { TaskRunnerService } from './task-runner.service';
import { StartupService } from './startup.service';
import { ContractZilService } from './contract-zil.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forRoot(MONGODB_URL),
    MongooseModule.forFeature([
      {
        name: LotteryDraw.name,
        schema: LotteryDrawSchema,
        collection: 'lottery_draw_collection'
      },
      {
        name: AppMetadata.name,
        schema: AppMetadataSchema,
        collection: 'app_metadata_entry'
      },
      {
        name: UserTicket.name,
        schema: UserTicketSchema,
        collection: 'user_ticket_collection'
      }
    ])
  ],
  controllers: [AppController],
  providers: [LotteryDrawService, TaskService, ContractZilService, TaskRunnerService, StartupService],
})
export class AppModule {}
