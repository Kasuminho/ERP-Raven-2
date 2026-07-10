import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AuditTimelineParamDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  targetType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  targetId!: string;
}
