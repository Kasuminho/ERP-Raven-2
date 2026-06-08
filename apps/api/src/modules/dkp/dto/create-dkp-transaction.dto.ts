import { DKPTransactionType } from '@prisma/client';

export class CreateDkpTransactionDto {
  playerId!: string;
  amount!: number;
  type!: DKPTransactionType;
  referenceId?: string;
  createdById!: string;
}
