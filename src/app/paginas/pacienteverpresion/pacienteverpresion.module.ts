import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PacienteverpresionPageRoutingModule } from './pacienteverpresion-routing.module';

import { PacienteverpresionPage } from './pacienteverpresion.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PacienteverpresionPageRoutingModule
  ],
  declarations: [PacienteverpresionPage]
})
export class PacienteverpresionPageModule {}
