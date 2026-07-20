import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

const PROOF_URL = /^(https?:\/\/|\/uploads\/).+/i;

export class CreateDiamondSaleDto {
  @IsUUID()
  itemCatalogId!: string;

  @IsIn(['GUILD_MEMBER', 'EXTERNAL'])
  buyerType!: 'GUILD_MEMBER' | 'EXTERNAL';

  @ValidateIf((value: CreateDiamondSaleDto) => value.buyerType === 'GUILD_MEMBER')
  @IsUUID()
  buyerPlayerId?: string;

  @ValidateIf((value: CreateDiamondSaleDto) => value.buyerType === 'EXTERNAL')
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  buyerName?: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  diamondCustodian!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  diamondTotal!: number;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Matches(PROOF_URL)
  @MaxLength(2048)
  itemProofImageUrl!: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Matches(PROOF_URL)
  @MaxLength(2048)
  saleProofImageUrl!: string;

  @IsIn(['ALL_ACTIVE', 'EXCLUDE_SELECTED'])
  recipientMode!: 'ALL_ACTIVE' | 'EXCLUDE_SELECTED';

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  excludedPlayerIds?: string[];
}

export class DeliverDiamondShareDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @Matches(PROOF_URL)
  @MaxLength(2048)
  proofImageUrl!: string;
}
