import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppMetadata, AppMetadataDocument } from './app-metadata.schema';
import { CONTRACT_ADDRESS, LOTTERY_TICKET_CONTRACT_ADDRESS, PRIVATE_KEY, URL_ZILLIQA } from './app.constants';
import { ContractZilService } from './contract-zil.service';
import { LotteryDraw, LotteryDrawDocument } from './lottery-draw.schema';
import { UserTicket, UserTicketDocument } from './user-ticket.schema';

const { BN, Long, bytes, units } = require('@zilliqa-js/util');
const { Zilliqa } = require('@zilliqa-js/zilliqa');
const {
  toBech32Address,
  getAddressFromPrivateKey,
} = require('@zilliqa-js/crypto');

@Injectable()
export class StartupService {

  private readonly logger = new Logger(StartupService.name);

  constructor(
    @InjectModel(LotteryDraw.name) private lotteryDrawModel: Model<LotteryDrawDocument>,
    @InjectModel(AppMetadata.name) private appMetadataModel: Model<AppMetadataDocument>,
    private readonly contractZilService: ContractZilService
  ) {}
  
  public async createDrawIfNotExistOnStartup() {    
    const latestDrawArray = await this.lotteryDrawModel.find()
      .sort({ "drawNumber": -1 })
      .limit(1)
      .exec();

    if(!latestDrawArray || latestDrawArray.length == 0) {
      console.log("Setting startup values initial");
      // Since we only read state at the START of the app, data size would never be a problem, so this is alright
      // However a proper sync solution should be created (where we track block number) and when the server
      // starts up we simply sync everything to the latest block number.
      // As it stands the server does not have this capability and needs to be up before anyone uses / tests the app
      // and can not have any downtime whatsoever
      const contractState: any = await this.getContractState();
      const createLotteryDrawModel = new this.lotteryDrawModel({ drawNumber: 1, date: Number(contractState.draw_timestamp), totalDrawPool: 0 });
      await createLotteryDrawModel.save();

      const appState = new this.appMetadataModel({ staticId: 1, ticketPrice: Number(contractState.ticket_price) });
      await appState.save();
      console.log("Completed lottery details");

      console.log("Starting setting up minter");
      // This is just really to make it easy to test and review 
      await this.setupMinter();
      console.log("Done setting up minter");
    }
  }

  private async setupMinter() {
    const callTx = await this.contractZilService.createZilliqaContractObject(LOTTERY_TICKET_CONTRACT_ADDRESS).call(
      'ConfigureMinter',
      [
        {
          vname: 'minter',
          type: 'ByStr20',
          value: `${CONTRACT_ADDRESS.toLowerCase()}`
        }
      ],
      {
        // amount, gasPrice and gasLimit must be explicitly provided
        version: this.contractZilService.getVersionDetails(),
        amount: new BN(0),
        gasPrice: units.toQa('2000', units.Units.Li),
        gasLimit: Long.fromNumber(8000),
      },
      33,
      1000,
      false,
    );

    console.log(callTx);
  }

  private getContractState() {
    const zilliqa = new Zilliqa(URL_ZILLIQA);
    const deployedContract = zilliqa.contracts.at(CONTRACT_ADDRESS);
    return deployedContract.getState();
  }
 
}



