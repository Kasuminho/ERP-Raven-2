import { ValidationPipe } from '@nestjs/common';

// Most legacy DTOs are property-only classes. Whitelisting them globally strips
// valid fields until their decorators are migrated module by module.
export function createGlobalValidationPipe(): ValidationPipe {
  return new ValidationPipe({ transform: true });
}

