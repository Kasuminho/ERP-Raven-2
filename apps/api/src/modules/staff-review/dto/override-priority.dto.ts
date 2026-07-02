import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class OverridePriorityDto {
  @IsUUID()
  targetPlayerId!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
