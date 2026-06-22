import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminAsignacionesPageRoutingModule } from './admin-asignaciones-routing.module';

import { AdminAsignacionesPage } from './admin-asignaciones.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminAsignacionesPageRoutingModule
  ],
  declarations: [AdminAsignacionesPage]
})
export class AdminAsignacionesPageModule {}
