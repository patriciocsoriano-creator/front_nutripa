import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EnfermeriaReportesPageRoutingModule } from './enfermeria-reportes-routing.module';

import { EnfermeriaReportesPage } from './enfermeria-reportes.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EnfermeriaReportesPageRoutingModule
  ],
  declarations: [EnfermeriaReportesPage]
})
export class EnfermeriaReportesPageModule {}
