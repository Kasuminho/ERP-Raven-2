import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AutomationNotificationJob } from '../types/automation.types';

@Injectable()
export class AutomationNotificationQueueService {
  private readonly pendingJobs: AutomationNotificationJob[] = [];

  enqueue(
    job: Omit<AutomationNotificationJob, 'id' | 'createdAt'>,
  ): AutomationNotificationJob {
    const queuedJob: AutomationNotificationJob = {
      ...job,
      id: randomUUID(),
      createdAt: new Date(),
    };

    this.pendingJobs.push(queuedJob);
    return queuedJob;
  }

  drain(): AutomationNotificationJob[] {
    return this.pendingJobs.splice(0, this.pendingJobs.length);
  }

  size(): number {
    return this.pendingJobs.length;
  }
}
