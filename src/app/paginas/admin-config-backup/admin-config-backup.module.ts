import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdminConfigBackupPageRoutingModule } from './admin-config-backup-routing.module';

import { AdminConfigBackupPage } from './admin-config-backup.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminConfigBackupPageRoutingModule
  ],
  declarations: [AdminConfigBackupPage]
})
export class AdminConfigBackupPageModule {}
