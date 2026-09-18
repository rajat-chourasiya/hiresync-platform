import { IsString, IsIn } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  planId!: string;

  @IsIn(['monthly', 'yearly'])
  billingCycle!: string;
}