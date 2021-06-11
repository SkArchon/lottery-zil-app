import { Component, Inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { ContractService } from 'app/service/contract.service';

@Component({
  selector: 'app-progress-dialog',
  templateUrl: './progress-dialog.component.html',
  styleUrls: ['./progress-dialog.component.scss']
})
export class ProgressDialogComponent {

  public header = '';
  public message = '';

  constructor(contractService: ContractService,
              private store: Store,
              @Inject(MAT_DIALOG_DATA) data,
              private dialogRef: MatDialogRef<ProgressDialogComponent>,
              formBuilder: FormBuilder) {
    this.header = data.header;
    this.message = data.message;
    data.observable.subscribe(_ => {
      this.dialogRef.close();
    }, _ => {
      this.dialogRef.close();
    });
  }




}
