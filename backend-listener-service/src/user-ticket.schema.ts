import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserTicketDocument = UserTicket & Document;

@Schema()
export class UserTicket {

  @Prop()
  ticketId: number;

  @Prop()
  accountAddress: string;

  @Prop()
  winnings: number;

  @Prop()
  drawNumber: number;

}

export const UserTicketSchema = SchemaFactory.createForClass(UserTicket);