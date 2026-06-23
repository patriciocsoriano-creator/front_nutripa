import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminReportesGlobalesPageRoutingModule } from './admin-reportes-globales-routing.module';

import { AdminReportesGlobalesPage } from './admin-reportes-globales.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminReportesGlobalesPageRoutingModule
  ],
  declarations: [AdminReportesGlobalesPage]
})
export class AdminReportesGlobalesPageModule {}
