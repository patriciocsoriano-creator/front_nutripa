import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { EnfermeriaverpacientesPageRoutingModule } from './enfermeriaverpacientes-routing.module';

import { EnfermeriaverpacientesPage } from './enfermeriaverpacientes.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    EnfermeriaverpacientesPageRoutingModule
  ],
  declarations: [EnfermeriaverpacientesPage]
})
export class EnfermeriaverpacientesPageModule {}
