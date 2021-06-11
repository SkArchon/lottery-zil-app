import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LotteryDrawDocument = LotteryDraw & Document;

@Schema()
export class LotteryDraw {
  @Prop()
  drawNumber: number;

  @Prop()
  date: number;

  @Prop()
  totalDrawPool: number;
}

export const LotteryDrawSchema = SchemaFactory.createForClass(LotteryDraw);