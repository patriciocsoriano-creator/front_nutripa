import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminRolesPermisosPageRoutingModule } from './admin-roles-permisos-routing.module';

import { AdminRolesPermisosPage } from './admin-roles-permisos.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminRolesPermisosPageRoutingModule
  ],
  declarations: [AdminRolesPermisosPage]
})
export class AdminRolesPermisosPageModule {}
