import { createAction, createReducer, on, props } from '@ngrx/store';
import { logoutUser } from './user.reducer';

export const approveContract = createAction('[Lottery] Approve Contract');
export const lotteryLoadData = createAction('[Lottery] Load Lottery Data');
export const lotteryDataLoadSuccess = createAction('[Lottery] Load Lottery Data Success',
  props<{ nextDrawTimestamp: number, drawPool: number, drawNumber: number, ticketPrice: number }>());
export const lotteryDataLoadFailure = createAction('[Lottery] Load Lottery Data Failure');
export const lotteryFeatureKey = 'lottery';

export const loadUserBalance = createAction('[Lottery] Load User Balance', props<{ accountAddress: string }>());
export const loadUserBalanceSuccess = createAction('[Lottery] Set User Balance',
  props<{ userBalance: number }>());
export const loadUserBalanceFailure = createAction('[Lottery] Load User Balance Failure');

export const checkForWinnings = createAction('[Lottery] Check For Winnings');
export const checkForWinningsFailure = createAction('[Lottery] Check For Winnings Failure');
export const setHasWinnings = createAction('[Lottery] Set Has Winnings');

export interface State {
  nextDrawTimestamp: number;
  drawPool: number;
  drawNumber: number;
  loadingState: 'success' | 'pending' | 'error';
  ticketPrice: number;
  hasWinnings: boolean;
  // These two should be moved to the user reducer
  lotteryAllowance: number;
  userBalance: number;
}

export const initialState: State = {
  nextDrawTimestamp: null,
  drawPool: null,
  drawNumber: null,
  loadingState: 'pending',
  ticketPrice: null,
  hasWinnings: false,
  lotteryAllowance: null,
  userBalance: null
};

export const reducer = createReducer(
  initialState,
  on(lotteryDataLoadSuccess, (state, { nextDrawTimestamp, drawPool, drawNumber, ticketPrice }) => {
    return ({ ...state, nextDrawTimestamp, drawPool, drawNumber, ticketPrice, loadingState: 'success' });
  }),
  on(lotteryDataLoadFailure, (state) => {
    return ({ ...state, loadingState: 'error' });
  }),
  on(setHasWinnings, (state) => {
    return ({ ...state, hasWinnings: true });
  }),
  on(logoutUser, (state) => {
    return ({ ...state, hasWinnings: false, lotteryAllowance: null, userBalance: null });
  }),
);


