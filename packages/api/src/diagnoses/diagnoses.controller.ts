import { Controller, Get, Post, Param, Body, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { QuotaGuard } from '../quota/quota.guard';
import { AiUsageInterceptor } from '../quota/ai-usage.interceptor';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DiagnosesService } from './diagnoses.service';
import { CreateDiagnosisDto } from './dto/create-diagnosis.dto';
import { CreateCampusDiagnosisDto } from './dto/create-campus-diagnosis.dto';
import {
  ProfessionPresetsService,
  ProfessionGroup,
} from '../profession-presets/profession-presets.service';

@Controller('diagnoses')
@UseGuards(JwtAuthGuard)
export class DiagnosesController {
  constructor(
    private readonly diagnoses: DiagnosesService,
    private readonly presets: ProfessionPresetsService,
  ) {}

  @Get('campus/professions')
  campusProfessions(): ProfessionGroup[] {
    return this.presets.list();
  }

  @Post()
  @UseGuards(QuotaGuard)
  @UseInterceptors(AiUsageInterceptor)
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateDiagnosisDto,
  ) {
    return this.diagnoses.create(user.id, dto);
  }

  @Post('campus')
  @UseGuards(QuotaGuard)
  @UseInterceptors(AiUsageInterceptor)
  createCampus(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCampusDiagnosisDto,
  ) {
    return this.diagnoses.createProfessionStandard(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.diagnoses.findAllByUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.diagnoses.findOne(id, user.id);
  }
}
