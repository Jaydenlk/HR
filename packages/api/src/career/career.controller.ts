import { Controller, Get, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CareerService } from './career.service';

@Controller('career')
@UseGuards(JwtAuthGuard)
export class CareerController {
  constructor(private readonly career: CareerService) {}

  @Get('analysis')
  async analyze(@CurrentUser() user: { id: string }) {
    try {
      return await this.career.analyze(user.id);
    } catch (err) {
      if (err instanceof Error && err.message === 'NO_RESUME') {
        throw new BadRequestException('请先上传简历后再使用职业地图功能');
      }
      throw err;
    }
  }
}
