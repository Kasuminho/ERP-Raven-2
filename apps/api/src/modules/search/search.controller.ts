import { Controller, Get, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SearchQueryDto } from './dto';
import { SearchService } from './search.service';
import { SearchResult } from './search.types';

@Controller('search')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
export class SearchController {
  constructor(private readonly service: SearchService) {}

  @Get()
  search(@Query() query: SearchQueryDto): Promise<SearchResult[]> {
    return this.service.search(query.q ?? '');
  }

  @Get('staff')
  @UseGuards(RolesGuard)
  @Roles('STAFF', 'ADMIN')
  staffSearch(@Query() query: SearchQueryDto): Promise<SearchResult[]> {
    return this.service.search(query.q ?? '', true);
  }
}
