import { Component, Inject, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { ContractService } from 'app/service/contract.service';
import { loadUserTickets } from 'app/store/reducers/user-ticket.reducer';
import { getAccountAddress } from 'app/store/selectors/users.selectors';
import { BehaviorSubject, from } from 'rxjs';
import { take } from 'rxjs/operators';
import { transactionListener } from '../custom.operators';

@Component({
  selector: 'app-transfer-dialog',
  templateUrl: './transfer-dialog.component.html',
  styleUrls: ['./transfer-dialog.component.scss']
})
export class TransferDialogComponent implements OnInit {

  private lotteryContract;

  public accountAddress = null;
  public ticketId = null;

  public transferForm: FormGroup;

  public submitLoader$ = new BehaviorSubject<string>('idle');

  constructor(private contractService: ContractService,
              private store: Store,
              @Inject(MAT_DIALOG_DATA) data,
              private dialogRef: MatDialogRef<TransferDialogComponent>,
              formBuilder: FormBuilder) {
    this.ticketId = data.ticketId;

    this.transferForm = formBuilder.group({
      targetAddress: new FormControl('', [Validators.required, this.addressValidator()]),
    });

    store.select(getAccountAddress).pipe(take(1))
      .subscribe((accountAddress) => {
        this.accountAddress = accountAddress;
      });

  }

  ngOnInit(): void {
  }

  transfer() {
    this.transferForm.markAllAsTouched();

    if (!this.transferForm.invalid) {
      this.runTransfer();
    }
  }

  async runTransfer() {
    const { utils, crypto } = (window as any).zilPay;

    const targetAddress = this.transferForm.controls.targetAddress.value;

    const base16Address = (utils.validation.isBech32(targetAddress))
      ? crypto.fromBech32Address(targetAddress).toLowerCase()
      : targetAddress.toLowerCase();

    this.submitLoader$.next('pending');

    try {
      from(this.contractService.transfer(base16Address, this.ticketId)).pipe(
        transactionListener(),
      ).subscribe(_result => {
        this.submitLoader$.next('success');
        setTimeout(_ => {
          this.store.dispatch(loadUserTickets());
          this.dialogRef.close({ status: true });
        }, 1000);
      }, _error => {
        this.submitLoader$.next('error');
      });
    }
    catch (e) {
      this.submitLoader$.next('error');
    }
  }

  addressValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      try {
        const { utils } = (window as any).zilPay;

        if (utils.validation.isBech32(control.value) || utils.validation.isAddress(control.value)) {
          return null;
        }
        return {addressNotValid: {value: control.value}};
      } catch (e) {
        return {addressNotValid: {value: control.value}};
      }
    };
  }



}
