import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PacienteverplanPageRoutingModule } from './pacienteverplan-routing.module';

import { PacienteverplanPage } from './pacienteverplan.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    PacienteverplanPageRoutingModule
  ],
  declarations: [PacienteverplanPage]
})
export class PacienteverplanPageModule {}
