import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { NotifyModule } from './notify/notify.module';
import { BalanceModule } from './balance/balance.module';
import { SettingsModule } from './settings/settings.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JobsModule } from './jobs/jobs.module';
import { ApplicationsModule } from './applications/applications.module';
import { DepositsModule } from './deposits/deposits.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PendingModule } from './pending/pending.module';
import { FilesModule } from './files/files.module';
import { ComplaintsModule } from './complaints/complaints.module';

@Module({
  imports: [
    // .env ni monorepo ildizidan ham, joriy katalogdan ham qidiramiz: backend
    // qaysi cwd dan ishga tushishidan qat'i nazar tokenlar/DB URL yuklanadi.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '../../../.env'), '.env'],
    }),
    PrismaModule,
    NotifyModule,
    BalanceModule,
    SettingsModule,
    AuthModule,
    UsersModule,
    JobsModule,
    ApplicationsModule,
    DepositsModule,
    DashboardModule,
    PendingModule,
    FilesModule,
    ComplaintsModule,
  ],
})
export class AppModule {}
