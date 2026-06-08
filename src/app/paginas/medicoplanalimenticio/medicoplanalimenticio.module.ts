import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MedicoplanalimenticioPageRoutingModule } from './medicoplanalimenticio-routing.module';

import { MedicoplanalimenticioPage } from './medicoplanalimenticio.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MedicoplanalimenticioPageRoutingModule
  ],
  declarations: [MedicoplanalimenticioPage]
})
export class MedicoplanalimenticioPageModule {}
