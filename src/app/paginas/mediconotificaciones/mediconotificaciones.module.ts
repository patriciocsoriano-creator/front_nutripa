import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MediconotificacionesPageRoutingModule } from './mediconotificaciones-routing.module';

import { MedicoNotificacionesPage } from './mediconotificaciones.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MediconotificacionesPageRoutingModule
  ],
  declarations: [MedicoNotificacionesPage]
})
export class MediconotificacionesPageModule {}
