import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RegistroinfometabolicasPageRoutingModule } from './registroinfometabolicas-routing.module';

import { RegistroinfometabolicasPage } from './registroinfometabolicas.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RegistroinfometabolicasPageRoutingModule
  ],
  declarations: [RegistroinfometabolicasPage]
})
export class RegistroinfometabolicasPageModule {}
