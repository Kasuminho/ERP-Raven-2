import { PlayerClass, PlayerCombatAvailability, PlayerCombatRole } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateCombatProfileDto {
  @IsEnum(PlayerClass)
  primaryClass!: PlayerClass;

  @IsOptional()
  @IsEnum(PlayerClass)
  secondaryClass?: PlayerClass;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  declaredBuild?: string;

  @IsOptional()
  @IsEnum(PlayerCombatRole)
  preferredRole?: PlayerCombatRole;

  @IsOptional()
  @IsArray()
  @IsEnum(PlayerCombatRole, { each: true })
  acceptedRoles?: PlayerCombatRole[];

  @IsOptional()
  @IsEnum(PlayerCombatAvailability)
  availability?: PlayerCombatAvailability;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  publicNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  staffNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  reason?: string;
}

export class PlayerCombatProfileParamDto {
  @IsUUID()
  playerId!: string;
}
