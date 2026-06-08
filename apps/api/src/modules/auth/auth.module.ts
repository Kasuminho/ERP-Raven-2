import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { AuthRepository } from './repositories/auth.repository';
import { JwtStrategy } from '../../common/strategies/jwt.strategy';
import { DiscordStrategy } from '../../common/strategies/discord.strategy';
import { DiscordModule } from '../discord/discord.module';

@Module({
  imports: [
    ConfigModule,
    DiscordModule,
    PassportModule.register({ session: false }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('auth.jwtAccessSecret'),
        signOptions: { expiresIn: config.get<string>('auth.jwtAccessTtl', '12h') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, JwtStrategy, DiscordStrategy],
  exports: [AuthService],
})
export class AuthModule {}
