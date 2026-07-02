import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MedicoverregistroPageRoutingModule } from './medicoverregistro-routing.module';

import { MedicoverregistroPage } from './medicoverregistro.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MedicoverregistroPageRoutingModule
  ],
  declarations: [MedicoverregistroPage]
})
export class MedicoverregistroPageModule {}
