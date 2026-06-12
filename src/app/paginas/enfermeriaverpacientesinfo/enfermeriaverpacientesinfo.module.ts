import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EnfermeriaverpacientesinfoPageRoutingModule } from './enfermeriaverpacientesinfo-routing.module';

import { EnfermeriaverpacientesinfoPage } from './enfermeriaverpacientesinfo.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EnfermeriaverpacientesinfoPageRoutingModule
  ],
  declarations: [EnfermeriaverpacientesinfoPage]
})
export class EnfermeriaverpacientesinfoPageModule {}
