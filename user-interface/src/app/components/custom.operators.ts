import { from, of, throwError, timer } from 'rxjs';
import { catchError, delay, filter, mergeMap, switchMap, take } from 'rxjs/operators';

export const transactionListener = () => {
    return mergeMap((result: any) => {
        const blockchain = (window as any).zilPay.blockchain;
        const txHash = `0x${result.TranID}`;
        return timer(0, 2000).pipe(
        switchMap(_count => {
            return from(blockchain.getTransaction(txHash)).pipe(
            catchError(_error => {
                if (_error.message && _error.message === 'Txn Hash not Present') {
                return of(null);
                }
                return throwError('Error');
            })
            );
        }),
        filter((transaction: any) => {
            if (!transaction || !transaction.receipt || transaction.receipt.success == null ) {
            return false;
            }
            if(transaction.receipt.success === false) {
            throw new Error('Transaction was not successful');
            }
            return true;
        }),
        delay(5000),
        take(1)
        );
    });
};

