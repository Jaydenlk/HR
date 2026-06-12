import { Controller, Post, Get, Body, UseGuards, Request, Req } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RequestCodeDto } from './dto/request-code.dto';
import { LoginDto } from './dto/login.dto';
import { DevLoginDto } from './dto/dev-login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // 发码端点收紧到每 IP 每分钟 3 次,防验证码轰炸/邮件滥用。
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('request-code')
  requestCode(@Body() dto: RequestCodeDto) {
    return this.auth.requestCode(dto);
  }

  // 登录端点收紧到每 IP 每分钟 10 次,防验证码爆破。
  // req.ip:main.ts 已设 trust proxy,Caddy 反代后仍取到真实客户端 IP,用于登录 IP/归属记录。
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: ExpressRequest) {
    return this.auth.login(dto, req.ip ?? null);
  }

  // 测试通道:免验证码免邀请码登录。仅 DEV_LOGIN=1 且非 production 时可用,否则 404。
  // 限流复用登录端点同档(每 IP 每分钟 10 次)。
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('dev-login')
  devLogin(@Body() dto: DevLoginDto, @Req() req: ExpressRequest) {
    return this.auth.devLogin(dto.email, req.ip ?? null);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: { user: { id: string } }) {
    return this.auth.getProfile(req.user.id);
  }
}
