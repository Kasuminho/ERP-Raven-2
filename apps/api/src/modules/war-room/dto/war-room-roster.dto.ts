import { PlayerClass, PlayerCombatRole, WarRoomRosterSlotStatus } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class WarRoomRosterSlotParamDto {
  @IsUUID()
  operationId!: string;

  @IsUUID()
  slotId!: string;
}

export class CreateWarRoomRosterSlotDto {
  @IsUUID()
  playerId!: string;

  @IsEnum(PlayerCombatRole)
  role!: PlayerCombatRole;

  @IsOptional()
  @IsEnum(PlayerClass)
  requiredClass?: PlayerClass;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  requiredLayer?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  publicInstructionsPt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  publicInstructionsEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  staffNote?: string;
}

export class UpdateWarRoomRosterSlotDto {
  @IsOptional()
  @IsEnum(PlayerCombatRole)
  role?: PlayerCombatRole;

  @IsOptional()
  @IsEnum(WarRoomRosterSlotStatus)
  status?: WarRoomRosterSlotStatus;

  @IsOptional()
  @IsEnum(PlayerClass)
  requiredClass?: PlayerClass;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  requiredLayer?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  publicInstructionsPt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  publicInstructionsEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  staffNote?: string;
}

export class MarkWarRoomAttendanceDto {
  @IsEnum(WarRoomRosterSlotStatus)
  status!: WarRoomRosterSlotStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  staffNote?: string;
}

export class PlayerWarRoomSlotParamDto {
  @IsUUID()
  slotId!: string;
}

export class PlayerWarRoomConfirmationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  playerNote?: string;
}
