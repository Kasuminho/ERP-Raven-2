import { DKPTransactionType } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateDkpTransactionDto {
  @IsUUID()
  playerId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(-2_147_483_648)
  @Max(2_147_483_647)
  amount!: number;

  @IsEnum(DKPTransactionType)
  type!: DKPTransactionType;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  referenceId?: string;

  // Internal audit context. Controllers must overwrite this with the authenticated actor.
  createdById!: string;
}
