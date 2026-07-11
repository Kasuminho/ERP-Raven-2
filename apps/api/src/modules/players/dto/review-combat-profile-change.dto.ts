import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CombatProfileChangeRequestParamDto {
  @IsUUID()
  requestId!: string;
}

export class ReviewCombatProfileChangeDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewNote?: string;
}
