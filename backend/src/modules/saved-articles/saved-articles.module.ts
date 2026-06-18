import { Module } from '@nestjs/common';
import { SavedArticlesController } from './saved-articles.controller';
import { SavedArticlesService } from './saved-articles.service';

@Module({
  controllers: [SavedArticlesController],
  providers: [SavedArticlesService],
  exports: [SavedArticlesService],
})
export class SavedArticlesModule {}
