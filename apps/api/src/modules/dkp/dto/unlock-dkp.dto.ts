import { IsUUID } from 'class-validator';

export class UnlockDkpDto {
  @IsUUID()
  lockId!: string;
}
