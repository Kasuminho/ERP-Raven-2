import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class PreviewDkpDecaySimulationDto {
  @IsInt()
  @Min(1)
  @Max(100)
  percent!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minimumDkp?: number;
}

export class SaveDkpDecaySimulationDto extends PreviewDkpDecaySimulationDto {
  @IsString()
  @MaxLength(120)
  name!: string;
}

export class PreviewDkpBidPolicySimulationDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  minimumCost?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  winTaxPercent?: number;

  @IsOptional()
  @IsObject()
  tierCaps?: Record<string, number>;

  @IsOptional()
  @IsObject()
  itemTypeCaps?: Record<string, number>;

  @IsOptional()
  @IsObject()
  layerCaps?: Record<string, number>;

  @IsOptional()
  @IsObject()
  fixedCostByTier?: Record<string, number>;

  @IsOptional()
  @IsObject()
  modeMultiplierPercent?: Record<string, number>;
}

export class SaveDkpBidPolicySimulationDto extends PreviewDkpBidPolicySimulationDto {
  @IsString()
  @MaxLength(120)
  name!: string;
}

export class PromoteDkpPolicySimulationDto {
  @IsBoolean()
  confirm!: boolean;

  @IsString()
  @MinLength(8)
  @MaxLength(240)
  reason!: string;
}
