import { Module } from '@nestjs/common';
import { ContactDevController } from './contact-dev.controller';

@Module({
  controllers: [ContactDevController],
})
export class ContactDevModule {}
