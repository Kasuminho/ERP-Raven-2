import { Allow, IsDefined } from 'class-validator';

export class UpdateBusinessRuleDto {
  @IsDefined()
  @Allow()
  value!: unknown;
}
