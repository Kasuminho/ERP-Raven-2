-- Definir cortes de presenca como 0 para o modo simples total da guilda
UPDATE "BusinessRule"
SET "value" = jsonb_set(
  jsonb_set(
    COALESCE("value", '{}'::jsonb),
    '{bidMinimumPercent}',
    '0'::jsonb
  ),
  '{participationMinimumPercent}',
  '0'::jsonb
)
WHERE "key" = 'attendanceEligibilityRules';
