import { PlayerClass, PlayerCombatRole } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';

export class EventCompositionTargetDto {
  @IsOptional()
  @IsEnum(PlayerCombatRole)
  role?: PlayerCombatRole;

  @IsOptional()
  @IsEnum(PlayerClass)
  playerClass?: PlayerClass;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  minimum!: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string;
}

export class UpdateEventCompositionTargetsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EventCompositionTargetDto)
  targets!: EventCompositionTargetDto[];
}
