import { Queue, Worker } from 'bullmq'
import IORedis from 'ioredis'
import { env } from '../../config'
import { prisma } from '../../db/client'
import { sendMessage } from '../whatsapp/client'
import { buildFollowUpMessage } from './followup.messages'
import { logger } from '../../utils/logger'

const connection = new IORedis({ host: env.REDIS_HOST, port: 6379, maxRetriesPerRequest: null })

const followupQueue = new Queue('followup', { connection })

export async function startFollowupWorker(): Promise<void> {
  // Per-minute poll — drains due follow-up rows
  await followupQueue.add('poll', {}, {
    jobId:  'followup-poll',
    repeat: { every: 60_000 },
    removeOnComplete: { count: 10 },
    removeOnFail:     { count: 50 },
  })

  // Daily job — enqueues WELLNESS_RECURRENCE for eligible patients
  await followupQueue.add('wellness-recurrence', {}, {
    jobId:  'wellness-recurrence-daily',
    repeat: { pattern: '0 9 * * *' }, // 9 AM every day
    removeOnComplete: { count: 5 },
  })

  const worker = new Worker('followup', async (job) => {
    if (job.name === 'wellness-recurrence') {
      await enqueueWellnessRecurrences()
    } else {
      await drainDueItems()
    }
  }, { connection, concurrency: 1 })

  worker.on('failed', (_job, err) =>
    logger.error('Follow-up worker failed', { err: err.message }),
  )

  logger.info('Follow-up worker started (poll: 60 s, wellness-recurrence: daily 9 AM)')
}

async function drainDueItems(): Promise<void> {
  const now = new Date()

  const items = await prisma.followUpQueue.findMany({
    where: {
      sent: false,
      OR: [
        { scheduled_at: null },
        { scheduled_at: { lte: now } },
      ],
    },
    include: { patient: true, appointment: true },
    orderBy: { created_at: 'asc' },
    take: 100,
  })

  if (!items.length) return

  logger.debug(`Processing ${items.length} follow-up(s)`)

  for (const item of items) {
    try {
      const text = buildFollowUpMessage(item)
      await sendMessage(item.patient.phone, text)
      await prisma.followUpQueue.update({
        where: { id: item.id },
        data:  { sent: true },
      })
      logger.info('Follow-up sent', { type: item.type, patientId: item.patient_id })
    } catch (err) {
      logger.error('Follow-up send failed', { id: item.id, type: item.type, err })
    }
  }
}

async function enqueueWellnessRecurrences(): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  // Find wellness appointments completed >= 30 days ago
  const eligible = await prisma.appointment.findMany({
    where: {
      pkg_name:  { not: null },
      appt_date: { lte: thirtyDaysAgo },
      status:    'COMPLETED',
    },
    include: { patient: true },
  })

  let enqueued = 0

  for (const appt of eligible) {
    // Skip if an unsent WELLNESS_RECURRENCE already exists for this patient
    const existing = await prisma.followUpQueue.findFirst({
      where: {
        patient_id: appt.patient_id,
        type:       'WELLNESS_RECURRENCE',
        sent:       false,
      },
    })
    if (existing) continue

    await prisma.followUpQueue.create({
      data: {
        patient_id: appt.patient_id,
        type:       'WELLNESS_RECURRENCE',
        appt_id:    appt.id,
      },
    })
    enqueued++
  }

  if (enqueued) logger.info(`Wellness recurrence: enqueued ${enqueued} reminder(s)`)
}
