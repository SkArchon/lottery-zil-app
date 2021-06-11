import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { setAccountAddress } from '../store/reducers/user.reducer';
import { CONTRACT_ADDRESS, LOTTERY_TICKET_CONTRACT_ADDRESS } from '../app.constants';
import { getAccountAddress } from '../store/selectors/users.selectors';
import { checkForWinnings } from '../store/reducers/lottery.reducer';
import { loadUserTickets } from 'app/store/reducers/user-ticket.reducer';
import { Store } from '@ngrx/store';

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  private lotteryContract = null;
  private lotteryTicketContract = null;

  private accountStatusSource = new Subject<any>();
  accountStatus$ = this.accountStatusSource.asObservable();

  logoutEvent$ = new Subject<void>();

  constructor(private store: Store) {
    this.store.select(getAccountAddress)
      .pipe(
        take(1),
        filter(address => !!address)
      )
      .subscribe(_ => {
        this.connectWallet();
      });
  }

  async connectWallet(): Promise<void> {
    await this.processProvider();
    this.initializeContracts();
  }

  async processProvider(): Promise<void> {
    try {
      const isConnect = await (window as any).zilPay.wallet.connect();
      if (isConnect) {
        const accountObj = (window as any).zilPay.wallet.defaultAccount;
        if (accountObj) {
          const accountId = accountObj.base16;
          this.store.dispatch(setAccountAddress({ accountAddress: accountId }));
          this.store.dispatch(loadUserTickets());
          this.store.dispatch(checkForWinnings());
          this.setupListeners();
        }
      } else {
          throw new Error('user rejected');
      }
    }
    catch(e) {
      console.log(e);
    }
  }

  private setupListeners(): void {
    // (window as any).zilPay.wallet.observableAccount().subscribe((account) => {
    //   this.store.dispatch(logoutUser());
    //   location.reload();
    // });

    // (window as any).zilPay.wallet.observableNetwork().subscribe((net)  => {
    //   this.store.dispatch(logoutUser());
    //   location.reload();
    // });
  }

  private initializeContracts(): void {
    this.lotteryContract = (window as any).zilPay.contracts.at(CONTRACT_ADDRESS);
    this.lotteryTicketContract = (window as any).zilPay.contracts.at(LOTTERY_TICKET_CONTRACT_ADDRESS);
  }

  public clearProvider() {
  }

  public async buyTickets(ticketCount: number, amountValue: number) {
    if (!this.lotteryContract) {
      alert('It seems ZilPay was not detected, please try refreshing the page');
    }

    const { utils } = (window as any).zilPay;

    const amount = utils.units.toQa(amountValue, utils.units.Units.Zil);
    const gasPrice = utils.units.toQa('1000', utils.units.Units.Li);

    const result = await this.lotteryContract.call(
      'buyTickets',
      [
        {
          vname: 'ticket_count',
          type: 'Uint256',
          value: `${ticketCount}`
        }
      ],
      {
        amount,
        gasPrice,
        gasLimit: utils.Long.fromNumber(9000)
      },
      true
    );

    return result;
  }

  public async claimFunds(ticketId) {
    if (!this.lotteryTicketContract) {
      alert('It seems ZilPay was not detected, please try refreshing the page');
    }

    const { utils } = (window as any).zilPay;

    const amount = utils.units.toQa(0, utils.units.Units.Zil);
    const gasPrice = utils.units.toQa('1000', utils.units.Units.Li);

    const result = await this.lotteryTicketContract.call(
      'ClaimFunds',
      [
        {
          vname: 'token_id',
          type: 'Uint256',
          value: `${ticketId}`
        }
      ],
      {
        amount,
        gasPrice,
        gasLimit: utils.Long.fromNumber(9000)
      },
      true
    );

    return result;
  }

  public async transfer(address, ticketId) {
    if (!this.lotteryTicketContract) {
      alert('It seems ZilPay was not detected, please try refreshing the page');
    }

    const { utils } = (window as any).zilPay;

    const amount = utils.units.toQa(0, utils.units.Units.Zil);
    const gasPrice = utils.units.toQa('1000', utils.units.Units.Li);

    const result = await this.lotteryTicketContract.call(
      'Transfer',
      [
        {
          vname: 'to',
          type: 'ByStr20',
          value: `${address.toLowerCase()}`
        },
        {
          vname: 'token_id',
          type: 'Uint256',
          value: `${ticketId}`
        }
      ],
      {
        amount,
        gasPrice,
        gasLimit: utils.Long.fromNumber(9000)
      },
      true
    );

    return result;
  }

  public async startDraw() {
    if (!this.lotteryContract) {
      alert('It seems ZilPay was not detected, please try refreshing the page');
    }

    const { utils } = (window as any).zilPay;

    const randomNumber = 1;

    const amount = utils.units.toQa(0, utils.units.Units.Zil);
    const gasPrice = utils.units.toQa('1000', utils.units.Units.Li);

    const result = await this.lotteryContract.call(
      'processDraw',
      [
        {
          vname: 'random_number',
          type: 'Uint256',
          value: `${randomNumber}`
        }
      ],
      {
        amount,
        gasPrice,
        gasLimit: utils.Long.fromNumber(9000)
      },
      true
    );

    return result;
  }

}
