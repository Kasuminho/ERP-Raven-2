import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class PlayerMembershipParamDto {
  @IsUUID()
  playerId!: string;
}

export class UpdatePlayerMembershipDto {
  @IsIn(['DEACTIVATE', 'ACTIVATE'])
  action!: 'DEACTIVATE' | 'ACTIVATE';

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason?: string;
}
