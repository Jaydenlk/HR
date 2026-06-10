import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginCode } from './entities/login-code.entity';
import { UsersModule } from '../users/users.module';
import { MailModule } from '../mail/mail.module';
import { InvitesModule } from '../invites/invites.module';
import { JwtStrategy } from '../common/guards/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([LoginCode]),
    UsersModule,
    MailModule,
    InvitesModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET', 'dev-secret'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
