import { Component, OnDestroy } from '@angular/core';
import { ContractService } from '../service/contract.service';
import { Store } from '@ngrx/store';
import { getAccountAddress, getAccountAddressShortened } from '../store/selectors/users.selectors';
import { from, Observable, of, Subject } from 'rxjs';
import { logoutUser } from '../store/reducers/user.reducer';
import { catchError, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy {

  public startDraw$ = new Subject<void>();

  public accountAddress$: Observable<string>;

  public remainingTime$ = new Subject<any>();
  public unsubscriber$ = new Subject<any>();

  constructor(private contractService: ContractService,
              private snackBar: MatSnackBar,
              private store: Store) {
    this.accountAddress$ = this.store.select(getAccountAddressShortened);
    this.setupStartDraw();
  }

  public signIn(): any {
    this.contractService.connectWallet();
  }

  public logout(): any {
    this.store.dispatch(logoutUser());
  }

  public setupStartDraw(): any {
    this.startDraw$.pipe(
      tap(_ => {
        alert('This is a method setup for ease of review and testing, to be removed for production');
      }),
      takeUntil(this.unsubscriber$),
      withLatestFrom(this.store.select(getAccountAddress)),
      switchMap(([_, accountAddress]) => {
        return from(this.contractService.startDraw());
      }),
      tap(_result => {
        this.snackBar.open('Draw process initiation transaction sent successfully.', 'Close');
      }),
      catchError(_error => {
        this.snackBar.open('An error occurred when trying to send the draw initiation transaction.', 'Close', {
          panelClass: ['failure-snackbar']
        });
        return of(false);
      })
    ).subscribe();
  }

  ngOnDestroy(): void {
    this.unsubscriber$.next();
    this.unsubscriber$.complete();
  }


}
