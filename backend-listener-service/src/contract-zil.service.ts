import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppMetadata, AppMetadataDocument } from './app-metadata.schema';
import { CONTRACT_ADDRESS, PRIVATE_KEY, URL_ZILLIQA } from './app.constants';
import { LotteryDraw, LotteryDrawDocument } from './lottery-draw.schema';
import { UserTicket, UserTicketDocument } from './user-ticket.schema';

const { BN, Long, bytes, units } = require('@zilliqa-js/util');
const { Zilliqa } = require('@zilliqa-js/zilliqa');
const {
  toBech32Address,
  getAddressFromPrivateKey,
} = require('@zilliqa-js/crypto');

@Injectable()
export class ContractZilService {

  private readonly logger = new Logger(ContractZilService.name);

  constructor() {}
  
  public createZilliqaContractObject(contractAddress) {    
    // TODO : This code is duplicated, there were unexpected issues when it was properly refactored. To identify issue and refactor.
    const zilliqa = new Zilliqa(URL_ZILLIQA);

    // Populate the wallet with an account
    zilliqa.wallet.addByPrivateKey(PRIVATE_KEY);

    const deployedContract = zilliqa.contracts.at(contractAddress);
    return deployedContract;
  }

  public getVersionDetails() {
    const chainId = 333; // chainId of the developer testnet
    const msgVersion = 1; // current msgVersion
    
    const VERSION = bytes.pack(chainId, msgVersion);
    return VERSION;
  }

 
}




