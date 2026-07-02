import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MedicovermedicionesPageRoutingModule } from './medicovermediciones-routing.module';

import { MedicovermedicionesPage } from './medicovermediciones.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MedicovermedicionesPageRoutingModule
  ],
  declarations: [MedicovermedicionesPage]
})
export class MedicovermedicionesPageModule {}
