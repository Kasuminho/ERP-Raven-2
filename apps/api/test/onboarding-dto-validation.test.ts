import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateOnboardingTemplateDto } from '../src/modules/onboarding/dto';

const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });

test('onboarding template DTO requires bilingual bounded steps and internal dashboard links', async () => {
  const valid = { name: 'Onboarding G3X', dueDays: 30, steps: [{ key: 'RULES', titlePt: 'Ler regras', titleEn: 'Read rules', descriptionPt: 'Leia a politica.', descriptionEn: 'Read the policy.', href: '/dashboard/rules', isRequired: true, completionType: 'RULES_ACK', displayOrder: 0 }] };
  const result = await pipe.transform(valid, { type: 'body', metatype: CreateOnboardingTemplateDto });
  assert.equal(result.steps[0].key, 'RULES');
  await assert.rejects(() => pipe.transform({ ...valid, steps: [{ ...valid.steps[0], href: 'https://evil.example' }] }, { type: 'body', metatype: CreateOnboardingTemplateDto }), BadRequestException);
  await assert.rejects(() => pipe.transform({ ...valid, steps: [{ ...valid.steps[0], titleEn: '' }] }, { type: 'body', metatype: CreateOnboardingTemplateDto }), BadRequestException);
});
