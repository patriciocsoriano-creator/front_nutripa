import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminEstadisticasPacientesPageRoutingModule } from './admin-estadisticas-pacientes-routing.module';

import { AdminEstadisticasPacientesPage } from './admin-estadisticas-pacientes.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminEstadisticasPacientesPageRoutingModule
  ],
  declarations: [AdminEstadisticasPacientesPage]
})
export class AdminEstadisticasPacientesPageModule {}
