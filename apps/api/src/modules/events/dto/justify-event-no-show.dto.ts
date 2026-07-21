import { IsString, MaxLength, MinLength } from 'class-validator';

export class JustifyEventNoShowDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  justification!: string;
}
