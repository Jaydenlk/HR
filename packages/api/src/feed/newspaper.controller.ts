import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NewspaperService } from './newspaper.service';

@Controller('newspaper')
@UseGuards(JwtAuthGuard)
export class NewspaperController {
  constructor(private readonly newspaper: NewspaperService) {}

  @Get()
  getEdition(@CurrentUser() user: { id: string }) {
    return this.newspaper.getNewspaper(user.id);
  }

  @Get('radar/companies')
  getRadarCompanies() {
    return this.newspaper.getRadarCompanies();
  }

  @Get('radar')
  getRadar(
    @Query('company') company?: string,
    @Query('role_category') roleCategory?: string,
    @Query('source_kind') sourceKind?: string,
    @Query('quarter') quarter?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.newspaper.getRadar({
      company,
      role_category: roleCategory,
      source_kind: sourceKind,
      quarter,
      keyword,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }
}
