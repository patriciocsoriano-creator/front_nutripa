import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminAgregarUsuarioPageRoutingModule } from './admin-agregar-usuario-routing.module';

import { AdminAgregarUsuarioPage } from './admin-agregar-usuario.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminAgregarUsuarioPageRoutingModule
  ],
  declarations: [AdminAgregarUsuarioPage]
})
export class AdminAgregarUsuarioPageModule {}
