import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MedicocrearplanPageRoutingModule } from './medicocrearplan-routing.module';

import { MedicocrearplanPage } from './medicocrearplan.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule,
    MedicocrearplanPageRoutingModule
  ],
  declarations: [MedicocrearplanPage]
})
export class MedicocrearplanPageModule {}
