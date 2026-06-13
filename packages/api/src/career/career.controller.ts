import {
  Body,
  Controller,
  Get,
  Param,
  ParseArrayPipe,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreditGuard } from '../credit/credit.guard';
import { AiUsageInterceptor } from '../quota/ai-usage.interceptor';
import { CreditInterceptor } from '../credit/credit.interceptor';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CareerService } from './career.service';
import { SelfAssessmentItemDto } from './dto/self-assessment.dto';

@Controller('career')
@UseGuards(JwtAuthGuard)
export class CareerController {
  constructor(private readonly career: CareerService) {}

  @Get('analysis')
  @UseGuards(CreditGuard)
  @UseInterceptors(AiUsageInterceptor, CreditInterceptor)
  analyze(@CurrentUser() user: { id: string }) {
    return this.career.analyze(user.id);
  }

  // 历史列表:只读,不扣 credit。摘要形态,owner-only。
  @Get('history')
  listHistory(@CurrentUser() user: { id: string }) {
    return this.career.listHistory(user.id);
  }

  // 历史详情:只读,不扣 credit。owner-only,404 不泄露存在性。
  @Get('history/:id')
  getHistory(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.career.getHistory(id, user.id);
  }

  // 问卷自评 upsert:不扣 credit。body 为数组 [{skill_name, self_score}],逐项校验。
  @Post('self-assessment')
  async upsertSelfAssessment(
    @CurrentUser() user: { id: string },
    @Body(new ParseArrayPipe({ items: SelfAssessmentItemDto }))
    items: SelfAssessmentItemDto[],
  ) {
    const written = await this.career.upsertSelfAssessment(user.id, items);
    return { written };
  }
}
