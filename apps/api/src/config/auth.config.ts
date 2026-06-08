import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
  jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? '12h',
  jwtRefreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
}));
