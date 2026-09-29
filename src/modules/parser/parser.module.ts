import { Global, Module } from '@nestjs/common';
import { BanglaNlpService } from './bangla-nlp.service';

@Global()
@Module({
  providers: [BanglaNlpService],
  exports: [BanglaNlpService],
})
export class ParserModule {}
