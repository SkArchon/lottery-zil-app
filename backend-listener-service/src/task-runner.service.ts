import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppMetadata, AppMetadataDocument } from './app-metadata.schema';
import { CONTRACT_ADDRESS, PRIVATE_KEY, URL_ZILLIQA } from './app.constants';
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
export class TaskRunnerService {
  private readonly logger = new Logger(TaskRunnerService.name);

  constructor(
    private readonly contractZilService: ContractZilService
  ) {}

  public async runDraw(seed) {
    try {
      this.logger.log(`Running draw with seed ${seed}`);

      // This could be refactored into a common class where only the input params and the address
      // will be taken as params to run the contract
      const callTx = await this.contractZilService.createZilliqaContractObject(CONTRACT_ADDRESS).call(
        'processDraw',
        [
          {
            vname: 'random_number',
            type: 'Uint256',
            value: `${seed}`
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
  
      return true;
    } catch (err) {
      return false;
    }
  }
 
}



