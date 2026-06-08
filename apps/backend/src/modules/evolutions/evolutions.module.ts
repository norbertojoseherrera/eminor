import { Module } from '@nestjs/common';
import { EvolutionsController } from './evolutions.controller';
import { EvolutionsService } from './evolutions.service';

@Module({
  controllers: [EvolutionsController],
  providers: [EvolutionsService],
})
export class EvolutionsModule {}
