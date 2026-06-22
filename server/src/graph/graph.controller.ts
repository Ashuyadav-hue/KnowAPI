import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { GraphService } from './graph.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('graph')
export class GraphController {
  constructor(private graphService: GraphService) {}

  @Get('concepts')
  async getConceptsGraph(@Request() req: any) {
    return this.graphService.getGraphData(req.user.id);
  }
}
