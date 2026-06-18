import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /** Monitoring uchun ochiq endpoint (token kerak emas). */
  @Public()
  @Get()
  check() {
    return this.healthService.check();
  }
}
