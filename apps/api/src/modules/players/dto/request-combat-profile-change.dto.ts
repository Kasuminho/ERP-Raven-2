import { PlayerClass, PlayerCombatAvailability, PlayerCombatRole } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestCombatProfileChangeDto {
  @IsOptional()
  @IsEnum(PlayerClass)
  primaryClass?: PlayerClass;

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
  @MaxLength(300)
  proofImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
