import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MedicoinformesPageRoutingModule } from './medicoinformes-routing.module';

import { MedicoinformesPage } from './medicoinformes.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MedicoinformesPageRoutingModule
  ],
  declarations: [MedicoinformesPage]
})
export class MedicoinformesPageModule {}
