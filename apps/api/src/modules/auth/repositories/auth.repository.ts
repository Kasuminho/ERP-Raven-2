import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthRepository {
  touch(): void {
    // foundation hook for persistence integration
  }
}
