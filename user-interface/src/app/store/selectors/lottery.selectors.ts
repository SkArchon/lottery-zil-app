import { createFeatureSelector, createSelector } from '@ngrx/store';
import { State } from '../reducers/lottery.reducer';
import { DateTime } from 'luxon';
import { CommonUtil } from 'app/common.util';

export const getLotteryState = createFeatureSelector('lottery');

const _getNextDrawTimestamp = (state: State) => state.nextDrawTimestamp;
const _getLoadingState = (state: State) => state.loadingState;
const _getDrawNumber = (state: State) => state.drawNumber;
const _getDrawPool = (state: State) => state.drawPool;
const _getTicketPrice = (state: State) => state.ticketPrice;
const _getLotteryAllowance = (state: State) => state.lotteryAllowance;
const _getHasWinnings = (state: State) => state.hasWinnings;
const _getUserBalance = (state: State) => state.userBalance;

export const getNextDrawTimestamp = createSelector(
    getLotteryState,
    _getNextDrawTimestamp
);

export const getDateStringToNextDraw = createSelector(
    getNextDrawTimestamp,
    (timestamp) => {
        return (timestamp)
            ? DateTime.fromSeconds(timestamp).toFormat('fff')
            : '';
    }
);

export const getIsDrawDatePassed = createSelector(
    getNextDrawTimestamp,
    (timestamp) => {
        if (!timestamp) {
            return false;
        }
        const dateTimestamp = DateTime.fromSeconds(timestamp);
        const difference = dateTimestamp.diffNow().toObject().milliseconds;
        return difference < 0;
    }
);

export const getLoadingState = createSelector(
    getLotteryState,
    _getLoadingState
);

export const getDrawNumber = createSelector(
    getLotteryState,
    _getDrawNumber
);

export const getDrawPool = createSelector(
    getLotteryState,
    _getDrawPool
);

export const getDrawPoolFormatted = createSelector(
    getDrawPool,
    (drawPool) => CommonUtil.formatAmount(drawPool)
);

export const getTicketPrice = createSelector(
    getLotteryState,
    _getTicketPrice
);

export const getTicketPriceFormatted = createSelector(
    getTicketPrice,
    (ticketPrice) => CommonUtil.formatAmount(ticketPrice)
);

export const getLotteryAllowance = createSelector(
    getLotteryState,
    _getLotteryAllowance
);

export const getLotteryAllowanceFormatted = createSelector(
    getLotteryAllowance,
    (lotteryAllowance) => CommonUtil.formatAmount(lotteryAllowance)
);

export const getHasWinnings = createSelector(
    getLotteryState,
    _getHasWinnings
);

export const getUserBalance = createSelector(
    getLotteryState,
    _getUserBalance
);

