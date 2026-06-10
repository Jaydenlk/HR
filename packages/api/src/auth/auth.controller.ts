import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RequestCodeDto } from './dto/request-code.dto';
import { LoginDto } from './dto/login.dto';
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
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Request() req: { user: { id: string } }) {
    return this.auth.getProfile(req.user.id);
  }
}
