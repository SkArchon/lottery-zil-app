import { Component, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { ContractService } from 'app/service/contract.service';
import { of, Subject } from 'rxjs';
import { catchError, mergeMap, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { animate, style, transition, trigger } from '@angular/animations';
import { MatDialog } from '@angular/material/dialog';
import { FormGroup } from '@angular/forms';
import { CommonUtil } from 'app/common.util';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as userTicketSelectors from 'app/store/selectors/user-ticket.selectors';
import * as usersSelectors from 'app/store/selectors/users.selectors';
import { loadUserTickets } from 'app/store/reducers/user-ticket.reducer';
import { TransferDialogComponent } from '../transfer-dialog/transfer-dialog.component';
import { ProgressDialogComponent } from '../progress-dialog/progress-dialog.component';
import { transactionListener } from '../custom.operators';

@Component({
  selector: 'app-user-tickets',
  templateUrl: './user-tickets.component.html',
  styleUrls: ['./user-tickets.component.scss'],
  animations: [
    trigger('enterAnimation', [
      transition(':enter', [style({ opacity: 0 }), animate('500ms', style({ opacity: 1 }))]),
  ]),
  ]
})
export class UserTicketsComponent implements OnDestroy {

  public unsubscriber$ = new Subject<any>();

  public loadingState$;
  public tickets$;
  public userAddress$;

  public buyForm: FormGroup;
  public claimFunds$ = new Subject<string>();

  constructor(private contractService: ContractService,
              private store: Store,
              private snackBar: MatSnackBar,
              public dialog: MatDialog) {
    this.store.dispatch(loadUserTickets());

    this.loadingState$ = this.store.select(userTicketSelectors.getLoadingState);
    this.tickets$ = this.store.select(userTicketSelectors.getTickets);
    this.userAddress$ = this.store.select(usersSelectors.getAccountAddress);

    this.setupClaimFunds();
  }

  ngOnDestroy(): void {
    this.unsubscriber$.next();
    this.unsubscriber$.complete();
  }

  public formatAmountfromQa(value): string {
    return CommonUtil.formatAmount(CommonUtil.getNumber(value));
  }

  public transfer(ticketId) {
    const dialogRef = this.dialog.open(TransferDialogComponent, {
      data: { ticketId }
    });

    return dialogRef.afterClosed().subscribe();
  }

  public setupClaimFunds() {
    this.claimFunds$.pipe(
      takeUntil(this.unsubscriber$),
      withLatestFrom(this.userAddress$),
      mergeMap(([ticketId, address]) => {
        const obs$ = of({}).pipe(
          mergeMap(() => {
            return this.contractService.claimFunds(ticketId);
          }),
          transactionListener(),
          tap(_result => {
            setTimeout(() => {
              this.snackBar.open(`Your Ticket Was Successfully Claimed`, 'Close');
              this.store.dispatch(loadUserTickets());
            }, 1000);
          }),
          catchError(() => {
            this.snackBar.open('We were unable to claim your ticket, please refresh and try again.', 'Close', {
              panelClass: ['failure-snackbar']
            });
            return of(false);
          }));

        const dialogRef = this.dialog.open(ProgressDialogComponent, {
          data: {
            header: 'Claiming Ticket',
            observable: obs$,
            message: 'Claiming Ticket'
           }
        });
        return dialogRef.afterClosed();
      })
    )
    .subscribe();
  }

}
