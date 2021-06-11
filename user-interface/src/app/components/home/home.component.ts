import { Component, OnDestroy } from '@angular/core';
import { Store } from '@ngrx/store';
import { ContractService } from 'app/service/contract.service';
import { lotteryLoadData } from 'app/store/reducers/lottery.reducer';
import {
  getDateStringToNextDraw,
  getDrawNumber,
  getLoadingState,
  getNextDrawTimestamp,
  getDrawPoolFormatted,
  getTicketPrice,
  getTicketPriceFormatted,
  getHasWinnings
} from 'app/store/selectors/lottery.selectors';
import { from, interval, Observable, of, Subject } from 'rxjs';
import { catchError, filter, map, mergeMap, startWith, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { DateTime } from 'luxon';
import { getDuraionToNextDraw, getIsDrawDateValuePassed } from 'app/store/selectors/helpers';
import { animate, style, transition, trigger } from '@angular/animations';
import { MatDialog } from '@angular/material/dialog';
import { CommonUtil } from 'app/common.util';
import { MatSnackBar } from '@angular/material/snack-bar';
import { getAccountAddress } from 'app/store/selectors/users.selectors';
import { loadLotteryDraws } from 'app/store/reducers/lottery-draws.reducer';
import * as lotteryDrawSelectors from 'app/store/selectors/lottery-draws.selectors';
import * as userTicketSelectors from 'app/store/selectors/user-ticket.selectors';
import { loadUserTickets } from 'app/store/reducers/user-ticket.reducer';
import { ProgressDialogComponent } from '../progress-dialog/progress-dialog.component';
import { BackendService } from 'app/service/backend.service';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { transactionListener } from '../custom.operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  animations: [
    trigger('enterAnimation', [
      transition(':enter', [style({ opacity: 0 }), animate('500ms', style({ opacity: 1 }))]),
  ]),
  ]
})
export class HomeComponent implements OnDestroy {

  public unsubscriber$ = new Subject<any>();
  public remainingTime$ = new Subject<any>();
  public purchaseSubmit$ = new Subject<void>();
  public isDrawDatePassed$ = new Subject<boolean>();

  // This should be the same as in the contract
  // since both are constants we dont retrieve them from the contract
  public readonly maxTicketsPerPurchase = 100;

  public dateString$;
  public loadingState$;
  public drawNumber$;
  public drawPoolFormatted$;
  public ticketPrice$: Observable<number>;
  public ticketPriceFormatted$;
  public caluclatedPrice$;
  public hasWinnings$;
  public accountAddress$;

  public lotteryDrawLoadingState$;
  public draws$;

  public userTicketsLoadingState$;
  public userTickets$;


  // workaround since async validator didnt work with withLatestFrom
  public ticketPriceValue = null;

  public buyForm: FormGroup;

  constructor(private contractService: ContractService,
              private snackBar: MatSnackBar,
              private store: Store,
              public dialog: MatDialog,
              public backendService: BackendService,
              formBuilder: FormBuilder) {
    this.store.dispatch(lotteryLoadData());
    this.store.dispatch(loadUserTickets());
    this.store.dispatch(loadLotteryDraws());

    this.dateString$ = this.store.select(getDateStringToNextDraw);
    this.drawNumber$ = this.store.select(getDrawNumber);
    this.drawPoolFormatted$ = this.store.select(getDrawPoolFormatted);
    this.ticketPrice$ = this.store.select(getTicketPrice);
    this.ticketPriceFormatted$ = this.store.select(getTicketPriceFormatted);

    this.hasWinnings$ = this.store.select(getHasWinnings);
    this.accountAddress$ = this.store.select(getAccountAddress);

    this.draws$ = this.store.select(lotteryDrawSelectors.getFirstThreeDraws);
    this.lotteryDrawLoadingState$ = this.store.select(lotteryDrawSelectors.getLoadingState)
      .pipe(startWith('pending'));

    this.userTickets$ = this.store.select(userTicketSelectors.getFirstThreeTickets);
    this.userTicketsLoadingState$ = this.store.select(userTicketSelectors.getLoadingState)
       .pipe(startWith('pending'));

    this.loadingState$ = this.store.select(getLoadingState)
      .pipe(startWith('pending'));

    this.ticketPrice$.subscribe((ticketPriceValue) => {
      this.ticketPriceValue = ticketPriceValue;
    });

    this.getDurationUpdater().subscribe(this.remainingTime$);
    this.getIsDrawDateValuePassedUpdater().subscribe(this.isDrawDatePassed$);

    this.getIsDrawDateValuePassedUpdater(20000).pipe(
      filter(result => result),
      tap(_ => {
        this.store.dispatch(lotteryLoadData());
        this.store.dispatch(loadUserTickets());
        this.store.dispatch(loadLotteryDraws());
      })
    ).subscribe();

    this.buyForm = formBuilder.group({
      ticketCount: new FormControl(1, [
        Validators.required,
        Validators.max(this.maxTicketsPerPurchase),
        this.numberValidator(),
        this.wholeNumberValidator()
      ])
    });

    this.caluclatedPrice$ = this.buyForm.controls.ticketCount.valueChanges.pipe(
      startWith(this.buyForm.controls.ticketCount.value),
      withLatestFrom(this.ticketPrice$),
      map(([ticketCount, ticketPrice]) => {
        const ticketCountNumber = Number(ticketCount);
        if ((isNaN(ticketCountNumber) || ticketCountNumber < 0) ) {
          return CommonUtil.formatAmount(0.00);
        }
        return (ticketCount.toString().indexOf('.') > -1)
          ? CommonUtil.formatAmount(0.00)
          : CommonUtil.formatAmount((ticketCountNumber * ticketPrice));
      })
    );

    this.setupBuyButton();
  }

  private setupBuyButton() {
    this.purchaseSubmit$.pipe(
      takeUntil(this.unsubscriber$),
      withLatestFrom(this.store.select(getAccountAddress)),
      filter(([_, accountAddress]) => {
        if (accountAddress) {
          return true;
        }
        this.snackBar.open('Please sign in using the "Sign In" button at the top right hand corner first', 'Close', {
          panelClass: ['failure-snackbar']
        });
        return false;
      }),
      filter(_ => {
        this.buyForm.markAllAsTouched();

        if (this.buyForm.invalid) {
          this.snackBar.open('Please make sure to enter a valid amount', 'Close', {
            panelClass: ['failure-snackbar']
          });
        }

        return !this.buyForm.invalid;
      }),
      switchMap(_ => {
        return of({}).pipe(
          withLatestFrom(this.drawNumber$),
          switchMap(([_v, localDrawNumber]) => {
            return this.backendService.getLotteryDraws().pipe(
              map((result: any) => {
                return (Number(localDrawNumber) === localDrawNumber)
                  ? 'success'
                  : 'failure';
              }),
              catchError(_error => {
                return of('error');
              })
            );
          })
        );
      }),
      filter(result => {
        switch (result) {
          case 'error':
            this.snackBar.open('An unexpected exception happened when validating the draw.', 'Close', {
              panelClass: ['failure-snackbar']
            });
            return false;
          case 'failure':
            this.snackBar.open('It seems like the draw has expired, please refresh and purchase.', 'Close', {
              panelClass: ['failure-snackbar']
            });
            return false;
          default:
            return true;
        }
      }),
      withLatestFrom(this.store.select(getAccountAddress), this.drawNumber$),
      mergeMap(([_, accountAddress, drawNumber]) => {
        const ticketCount = this.buyForm.controls.ticketCount.value;
        const price = ticketCount * this.ticketPriceValue;

        const promise = this.contractService.buyTickets(ticketCount, price);

        const obs$ = of({}).pipe(
          mergeMap(() => from(promise)),
          transactionListener(),
          tap(_success => {
            setTimeout(() => {
              this.snackBar.open(`${ticketCount} Tickets purchased successfully`, 'Close');
              this.store.dispatch(lotteryLoadData());
              this.store.dispatch(loadUserTickets());
            }, 1000);
          }),
          catchError(_error => {
            setTimeout(() => {
              this.store.dispatch(lotteryLoadData());
              this.store.dispatch(loadUserTickets());
            }, 1000);

            this.snackBar.open('We were unable to buy the tickets required', 'Close', {
              panelClass: ['failure-snackbar']
            });
            return of(false);
          })
        );

        const dialogRef = this.dialog.open(ProgressDialogComponent, {
          data: {
            header: 'Purchasing Tickets',
            observable: obs$,
            message: 'Purchasing Tickets'
           }
        });
        return dialogRef.afterClosed();
      })
    )
    .subscribe();
  }

  private getDurationUpdater() {
    return interval(1000).pipe(
      takeUntil(this.unsubscriber$),
      withLatestFrom(this.store.select(getNextDrawTimestamp)),
      filter(([_, result]) => !!result),
      map(([_, timestamp]) => getDuraionToNextDraw(timestamp))
    );
  }

  private getIsDrawDateValuePassedUpdater(intervalValue: number = 1000) {
    return interval(intervalValue).pipe(
      takeUntil(this.unsubscriber$),
      withLatestFrom(this.store.select(getNextDrawTimestamp)),
      map(([_, timestamp]) => getIsDrawDateValuePassed(timestamp))
    );
  }

  public formatAmount(value): string {
    return CommonUtil.formatAmount(value);
  }

  public formatAmountfromQa(value): string {
    return CommonUtil.formatAmount(CommonUtil.getNumber(value));
  }

  public formatDate(timestamp): string {
    return DateTime.fromSeconds(timestamp).toFormat('yyyy LLL dd');
  }

  numberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const numberValue = Number(control.value);
      return (isNaN(numberValue) || numberValue <= 0) ? {notNumber: true} : null;
    };
  }

  wholeNumberValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const numberValue = Number(control.value);
      if (!(isNaN(numberValue) || numberValue < 0)) {
        return (control.value.toString().indexOf('.') > -1) ? { notWholeNumber: true } : null;
      }
      return null;
    };
  }

  ngOnDestroy(): void {
    this.unsubscriber$.next();
    this.unsubscriber$.complete();
  }

}
