import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LotteryDraw, LotteryDrawDocument } from './lottery-draw.schema';
import { AppMetadata, AppMetadataDocument } from './app-metadata.schema';
import { from, of, Subject } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';
import { UserTicket, UserTicketDocument } from './user-ticket.schema';
import {
  URL_ZILLIQA,
  CONTRACT_ADDRESS,
  LOTTERY_TICKET_CONTRACT_ADDRESS,
  WS_ZILLIQA
} from './app.constants';
import { StartupService } from './startup.service';

const { StatusType, MessageType } = require('@zilliqa-js/subscriptions');
const { Zilliqa } = require('@zilliqa-js/zilliqa');

@Injectable()
export class LotteryDrawService implements OnModuleInit {

  private lotteryContract;
  private readonly logger = new Logger(LotteryDrawService.name);
  private eventProcessor$ = new Subject<any[]>();

  constructor(
    @InjectModel(LotteryDraw.name) private lotteryDrawModel: Model<LotteryDrawDocument>,
    @InjectModel(AppMetadata.name) private appMetadataModel: Model<AppMetadataDocument>,
    @InjectModel(UserTicket.name) private userTicketModel: Model<UserTicketDocument>,
    private readonly startupService: StartupService
  ) {
    this.setupEventProcessor();
  }
  
  async onModuleInit() {
    try {
      console.log("Create Metadata If Needed");
      await this.startupService.createDrawIfNotExistOnStartup();

      const zilliqa = new Zilliqa(URL_ZILLIQA);

      const subscriber = zilliqa.subscriptionBuilder.buildEventLogSubscriptions(
        WS_ZILLIQA,
        {
          addresses: [
            CONTRACT_ADDRESS,
            LOTTERY_TICKET_CONTRACT_ADDRESS],
        },
      );

      console.log("Listening Initiated");
      subscriber.emitter.on(StatusType.SUBSCRIBE_EVENT_LOG, (event) => {
        console.log('get SubscribeEventLog echo: ', event);
        if(event.value) {
          this.eventProcessor$.next(event.value);
        }
      });
      subscriber.emitter.on(MessageType.EVENT_LOG, (event, bb) => {
        // console.log('get new event log: ', JSON.stringify(event));
        if(event.value) {
          this.eventProcessor$.next(event.value);
        }
      });
      subscriber.emitter.on(MessageType.UNSUBSCRIBE, (event) => {
        // console.log('get unsubscribe event: ', event);
        if(event.value) {
          this.eventProcessor$.next(event.value);
        }
      });

      await subscriber.start();
      console.log("Started Listening");
    }
    catch(e) {
      console.error(e);
    }
  }

  private setupEventProcessor() {
    this.eventProcessor$.pipe(
      concatMap((entry: any) => entry),
      concatMap((entry: any) => entry.event_logs.reverse()),
      map((event: any) => {
        const paramsMap = event.params.reduce((accumulator, parameter) => {
          return {
            ...accumulator,
            [parameter.vname]: parameter.value
          }
        }, {});
        return {
          eventName: event._eventname,
          params: paramsMap
        }
      }),
      concatMap(({ eventName, params }) => {
        console.log(eventName);
        console.log(JSON.stringify(params));
        switch(eventName) {
          case "MintSuccess":
            return from(this.createTicket({ ticketId: params.token_id, accountAddress: params.recipient}));
          case "PurchaseCompleted":
            return from(this.updateDraw({ totalDrawPool: params.current_pool, drawNumber: params.draw_number }));
          case "DrawCompletion":
            return from(this.createDraw({ totalDrawPool: params.curr_pool, drawNumber: params.new_draw_number, date: params.timestamp }));
          case "AllocateWinnings":
            return from(this.allocateWinnings({ amount: params.amount, tokenId: params.token_id }));
          case "ClaimWinnings":
            return from(this.claimWinnings({ tokenId: params.token_id }));
          case "TransferSuccess":
            return from(this.transferToken({ tokenId: params.token_id, newAddress: params.recipient }));
          default:
            return of({});
        }
      }),
    ).subscribe();
  }

  private async claimWinnings(entry: { tokenId: number }) {
    const [ticket] = await this.userTicketModel.find()
      .find({ "ticketId": entry.tokenId })
      .limit(1)
      .exec();

    ticket.winnings = 0;
    await ticket.save();
  }

  private async transferToken(entry: { tokenId: number, newAddress: string }) {
    const [ticket] = await this.userTicketModel.find()
      .find({ "ticketId": entry.tokenId })
      .limit(1)
      .exec();
    ticket.accountAddress = entry.newAddress.toLowerCase();
    return await ticket.save();
  }

  private async allocateWinnings(entry: {amount : number, tokenId: number }) {
    const [ticket] = await this.userTicketModel.find()
      .find({ "ticketId": entry.tokenId })
      .limit(1)
      .exec();

    ticket.winnings = entry.amount;
    await ticket.save();
  }

  private async createTicket(ticketEntry: { ticketId: string, accountAddress: string }) {
    const [latestDraw] = await this.lotteryDrawModel.find()
      .sort({ "drawNumber": -1 })
      .limit(1)
      .exec();

    const processedTicket = {
      ticketId: ticketEntry.ticketId,
      accountAddress: ticketEntry.accountAddress.toLowerCase(),
      drawNumber: latestDraw.drawNumber,
      winnings: 0
    };
    const createTicketModel = new this.userTicketModel(processedTicket);
    return createTicketModel.save();
  }

  private createDraw(drawEntry: { totalDrawPool: number, drawNumber: number, date: number }) {
    const createLotteryDrawModel = new this.lotteryDrawModel(drawEntry);
    return createLotteryDrawModel.save();
  }

  private async updateDraw(drawEntry: { totalDrawPool: number, drawNumber: number }) {
    const latestDrawArray = await this.lotteryDrawModel.find()
      .sort({ "drawNumber": -1 })
      .limit(1)
      .exec();
    const currentDraw = latestDrawArray[0];
    currentDraw.totalDrawPool = drawEntry.totalDrawPool;
    return await currentDraw.save();
  }

  public async getUserCountForDraw() {
    const [latestDraw] = await this.lotteryDrawModel.find()
      .sort({ "drawNumber": -1 })
      .limit(1)
      .exec();

    const tickets = await this.userTicketModel.find()
      .find({ "drawNumber": latestDraw.drawNumber })
      .exec();

    return tickets.length;
  }


  //==================
  // Public methods
  //==================
  
  async create(lotteryDraw) {
    const createLotteryDrawModel = new this.lotteryDrawModel(lotteryDraw);
    const result = await createLotteryDrawModel.save();
    return result;
  }

  async findAll(page: number, limit: number) {
    const processedPage = page - 1;
    const skipAmount = processedPage * limit;
    return await this.lotteryDrawModel.find()
      .sort({ "drawNumber": -1 })
      .limit(1)
      .skip(skipAmount)
      .exec();
  }

  async getCurrentDraw() {
    const [currentDraw] = await this.lotteryDrawModel.find()
      .sort({ "drawNumber": -1 })
      .limit(1)
      .exec();

    const [appMetadata] = await this.appMetadataModel.find()
      .limit(1)
      .exec();
      
    const returnEntry = {
      amount: currentDraw.totalDrawPool,
      timestamp: currentDraw.date,
      currentDrawNumber: currentDraw.drawNumber,
      ticketPrice: `${appMetadata.ticketPrice}` // 10000000000000
    };
    return returnEntry;
  }

  async loadUserTickets(accountAddress = "") {
    return await this.userTicketModel.find()
      .find({ "accountAddress": accountAddress.toLowerCase() })
      .exec();
  }

  async hasWinnings(accountAddress) {
    const list = await this.userTicketModel.find()
      .find({ "accountAddress": accountAddress.toLowerCase(), winnings: {  $ne: null, $gt: 0 } })
      .exec();
    return { hasWinnings: list && list.length > 0 };
  }
}
