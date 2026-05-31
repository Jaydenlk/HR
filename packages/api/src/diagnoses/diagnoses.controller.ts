import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
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
  create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateDiagnosisDto,
  ) {
    return this.diagnoses.create(user.id, dto);
  }

  @Post('campus')
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
