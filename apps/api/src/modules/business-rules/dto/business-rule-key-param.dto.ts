import { IsIn } from 'class-validator';
import { businessRuleDefaults } from '../business-rules.defaults';

const businessRuleKeys = businessRuleDefaults.map((rule) => rule.key);

export class BusinessRuleKeyParamDto {
  @IsIn(businessRuleKeys)
  key!: string;
}
