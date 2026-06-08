import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MedicoplanalimenticioDetallePageRoutingModule } from './medicoplanalimenticio-detalle-routing.module';

import { MedicoplanalimenticioDetallePage } from './medicoplanalimenticio-detalle.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MedicoplanalimenticioDetallePageRoutingModule
  ],
  declarations: [MedicoplanalimenticioDetallePage]
})
export class MedicoplanalimenticioDetallePageModule {}
