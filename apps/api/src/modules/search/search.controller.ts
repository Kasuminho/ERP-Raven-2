import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SearchService } from './search.service';
import { SearchResult } from './search.types';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  search(@Query('q') query = ''): Promise<SearchResult[]> {
    return this.service.search(query);
  }

  @Get('staff')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  staffSearch(@Query('q') query = ''): Promise<SearchResult[]> {
    return this.service.search(query, true);
  }
}
