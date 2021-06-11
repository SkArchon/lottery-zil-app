import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { BackendService } from 'app/service/backend.service';
import { ContractService } from 'app/service/contract.service';
import { of, timer } from 'rxjs';
import { catchError, filter, map, mergeMap, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { loadLotteryDraws, loadLotteryDrawsFailure, loadLotteryDrawsSuccess } from '../reducers/lottery-draws.reducer';
import {
  lotteryLoadData,
  lotteryDataLoadSuccess,
  lotteryDataLoadFailure,
  setHasWinnings,
  checkForWinningsFailure,
  checkForWinnings
} from '../reducers/lottery.reducer';
import { loadUserTickets, loadUserTicketsFailure, loadUserTicketsSuccess } from '../reducers/user-ticket.reducer';
import { logoutUser } from '../reducers/user.reducer';
import { getAccountAddress } from '../selectors/users.selectors';
import { CommonUtil } from 'app/common.util';


@Injectable()
export class AppEffects {

  private checkHasWinningsInitialized = false;

  constructor(private actions$: Actions,
              private store: Store,
              private contractService: ContractService,
              private backendService: BackendService) { }

              // TODO :Do we need this?
  // ApproveContract$ = createEffect(() =>
  //   this.actions$.pipe(
  //     ofType(approveContract),
  //     withLatestFrom(getAccountAddress),
  //     mergeMap(([_, accountAddress]) => {
  //       const approveAmount = 100;
  //       const approveP$ = this.contractService.getUsdContract()
  //         .methods
  //         .approve(CONTRACT_ADDRESS, approveAmount)
  //         .send({from: accountAddress});
  //       return from(approveP$);
  //     }),
  //   ),
  //   { dispatch: false }
  // );

  LoadDataEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(lotteryLoadData),
      mergeMap((_) => this.backendService.getCurrentDraw()),
      map((result: any) => {
        const data = {
          nextDrawTimestamp: Number(result.timestamp),
          drawPool: Number(CommonUtil.getNumber(result.amount)),
          drawNumber: Number(result.currentDrawNumber),
          ticketPrice: Number(CommonUtil.getNumber(result.ticketPrice))
        };
        return lotteryDataLoadSuccess(data);
      }),
      catchError((error) => {
        console.log(error);
        return of(lotteryDataLoadFailure());
      })
    )
  );

  LoadUserTickets$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadUserTickets),
      withLatestFrom(this.store.select(getAccountAddress)),
      switchMap(([_, accountAddress]) => {
        if (!accountAddress) {
          return of([]);
        }
        return this.backendService.getUserTickets(accountAddress);
      }),
      map((tickets: any[]) => {
        const data = { tickets };
        return loadUserTicketsSuccess(data);
      }),
      catchError((_error) => {
        console.log(_error);
        return of(loadUserTicketsFailure());
      })
    )
  );

  CheckHasWinnings$ = createEffect(() =>
    this.actions$.pipe(
      ofType(checkForWinnings),
      filter(() => !this.checkHasWinningsInitialized),
      switchMap((_) => {
        this.checkHasWinningsInitialized = true;
        return timer(0, 60000).pipe(
          withLatestFrom(this.store.select(getAccountAddress)),
          filter(([_timerData, accountAddress]) => !!accountAddress),
          mergeMap(([_timerData, accountAddress]) => {
            return this.backendService.hasWinnings(accountAddress).pipe(
              filter((results: any) => results.hasWinnings),
              map((_result: any) => {
                return setHasWinnings();
              }),
              catchError((_error) => {
                console.log(_error);
                return of(checkForWinningsFailure());
              })
            );
          }),
        );
      }),
    )
  );

  LoadLotteryDraws$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadLotteryDraws),
      switchMap(_ => this.backendService.getLotteryDraws()),
      map((result: any[]) => {
        return loadLotteryDrawsSuccess({ draws: result });
      }),
      catchError((_error) => {
        console.log(_error);
        return of(loadLotteryDrawsFailure());
      })
    )
  );

  Logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(logoutUser),
      tap(_ => {
        this.contractService.clearProvider();
      })
    ),
    { dispatch: false }
  );

}
