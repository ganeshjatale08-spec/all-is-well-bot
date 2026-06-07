import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'
import { env } from '../../config'
import { logger } from '../../utils/logger'
import { processCrmJob, type CrmPayload } from './crm.job'

const connection = new IORedis({ host: env.REDIS_HOST, port: 6379, maxRetriesPerRequest: null })

export const crmQueue = new Queue('crm', { connection })

export async function enqueueCrmJob(payload: CrmPayload): Promise<void> {
  await crmQueue.add('submit', payload, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: { count: 100 },
    removeOnFail:     { count: 200 },
  })
  logger.debug('CRM job enqueued', { patientId: payload.patientId })
}

export function startCrmWorker(): void {
  const worker = new Worker(
    'crm',
    async (job) => processCrmJob(job.data),
    { connection },
  )

  worker.on('completed', (job) => logger.info('CRM job done', { id: job.id }))
  worker.on('failed', (job, err) => logger.error('CRM job failed', { id: job?.id, err: err.message }))
  logger.info('CRM worker started')
}
