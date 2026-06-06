import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FollowUpService } from './follow-up.service';
import { GenerateFollowUpDto } from './dto/generate-follow-up.dto';

@Controller('follow-up')
@UseGuards(JwtAuthGuard)
export class FollowUpController {
  constructor(private readonly followUp: FollowUpService) {}

  @Post('generate')
  generate(
    @CurrentUser() user: { id: string },
    @Body() dto: GenerateFollowUpDto,
  ) {
    return this.followUp.generate(dto, user.id);
  }
}
