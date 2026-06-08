import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PacienteverglucosaPageRoutingModule } from './pacienteverglucosa-routing.module';

import { PacienteverglucosaPage } from './pacienteverglucosa.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PacienteverglucosaPageRoutingModule
  ],
  declarations: [PacienteverglucosaPage]
})
export class PacienteverglucosaPageModule {}
