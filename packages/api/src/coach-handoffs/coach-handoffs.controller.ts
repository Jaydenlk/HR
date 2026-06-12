import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CoachHandoffsService } from './coach-handoffs.service';
import { UpdateHandoffStatusDto } from './dto/update-handoff-status.dto';

@Controller('coach-handoffs')
@UseGuards(JwtAuthGuard)
export class CoachHandoffsController {
  constructor(private readonly service: CoachHandoffsService) {}

  // GET /coach-handoffs/:id — 拉取 handoff 详情(owner-only,404 不泄露存在性)。
  // 返回 target/payload/status/conversation_id 供前端填表。
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    const h = await this.service.findOne(id, user.id);
    return {
      id: h.id,
      target: h.target,
      payload: h.payload,
      status: h.status,
      conversation_id: h.conversation_id,
    };
  }

  // PATCH /coach-handoffs/:id/status — 流转状态(owner-only)。
  // 合法流转:proposed→accepted/dismissed,accepted→completed;其余 400。
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateHandoffStatusDto,
  ) {
    const h = await this.service.updateStatus(id, user.id, dto.status);
    return {
      id: h.id,
      status: h.status,
    };
  }
}
