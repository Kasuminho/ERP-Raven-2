import { IsUUID } from 'class-validator';

export class NotificationIdParamDto {
  @IsUUID()
  id!: string;
}
