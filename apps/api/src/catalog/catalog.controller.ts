import { Controller, Get } from '@nestjs/common';
import { CatalogService } from './catalog.service.js';

@Controller('v1/catalog')
export class CatalogController { constructor(private readonly catalog: CatalogService) {} @Get() getCatalog() { return this.catalog.getCatalog(); } }
