import { Controller, Post, Body, UseGuards, HttpCode } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { EducationPathService } from './education-path.service';
import { AnalyzeEducationPathDto } from './dto/analyze-education-path.dto';

@Controller('education-path')
@UseGuards(JwtAuthGuard)
export class EducationPathController {
  constructor(private readonly educationPath: EducationPathService) {}

  @Post('analyze')
  @HttpCode(200)
  analyze(@Body() dto: AnalyzeEducationPathDto) {
    return this.educationPath.analyze(dto);
  }
}
