import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { AdminService } from './admin.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { UpdateInviteDto } from './dto/update-invite.dto';

// 管理后台:全部端点经 JwtAuthGuard(认证)+ AdminGuard(role==='admin')。
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  listUsers() {
    return this.admin.listUsers();
  }

  @Patch('users/:id')
  updateUser(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.admin.updateUser(req.user.id, id, dto);
  }

  @Get('invites')
  listInvites() {
    return this.admin.listInvites();
  }

  @Post('invites')
  createInvite(@Body() dto: CreateInviteDto) {
    return this.admin.createInvite(dto);
  }

  @Patch('invites/:id')
  updateInvite(@Param('id') id: string, @Body() dto: UpdateInviteDto) {
    return this.admin.updateInvite(id, dto.disabled);
  }

  @Get('usage')
  usage() {
    return this.admin.usageOverview();
  }
}
