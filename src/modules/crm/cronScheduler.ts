import { Queue, Worker } from 'bullmq'
import { sendMessage } from '../whatsapp/client'
import { prisma } from '../../db/client'
import { HOSPITAL_NAME, HOSPITAL_PHONE } from '../../config/constants'

const connection = { host: process.env.REDIS_HOST ?? 'localhost', port: 6379 }

export const crmQueue = new Queue('crm-outbound', { connection })

// ── Enqueue jobs after booking ─────────────────────────────────────────────────

export async function scheduleBookingJobs(apptId: string, phone: string, apptDate: Date) {
  // 1. Instant confirmation
  await crmQueue.add('confirmation', { apptId, phone }, { delay: 500 })

  // 2. 24h reminder
  const reminderDelay = apptDate.getTime() - Date.now() - 24 * 60 * 60 * 1000
  if (reminderDelay > 0)
    await crmQueue.add('reminder-24h', { apptId, phone }, { delay: reminderDelay })

  // 3. 4h post-appointment feedback
  const feedbackDelay = apptDate.getTime() - Date.now() + 4 * 60 * 60 * 1000
  await crmQueue.add('feedback', { apptId, phone }, { delay: feedbackDelay })
}

export async function scheduleWellnessRecurrence(
  phone: string,
  pkgName: string,
  days = 90, // 90–180 days
) {
  const delay = days * 24 * 60 * 60 * 1000
  await crmQueue.add('wellness-recurrence', { phone, pkgName }, { delay })
}

// ── Worker — processes queued messages ─────────────────────────────────────────

export function startCronWorker() {
  const worker = new Worker('crm-outbound', async (job) => {
    const { phone, apptId, pkgName } = job.data

    if (job.name === 'confirmation') {
      const appt = await prisma.appointment.findUnique({
        where:   { id: apptId },
        include: { patient: true },
      })
      await sendMessage(phone,
        `✅ *Appointment Confirmed!*\n\n` +
        `Hello *${appt?.patient.name ?? 'there'}*,\n` +
        `Your appointment at *${HOSPITAL_NAME}* is booked.\n\n` +
        `📋 Dept: ${appt?.department}\n` +
        `👨‍⚕️ ${appt?.specialist}\n` +
        `📅 ${appt?.appt_date.toDateString()}\n\n` +
        `For queries: *${HOSPITAL_PHONE}*`,
      )
    }

    if (job.name === 'reminder-24h') {
      const appt = await prisma.appointment.findUnique({
        where:   { id: apptId },
        include: { patient: true },
      })
      await sendMessage(phone,
        `⏰ *Appointment Reminder*\n\n` +
        `Hello *${appt?.patient.name ?? 'there'}*, your appointment is *tomorrow* at ${HOSPITAL_NAME}.\n` +
        `📋 ${appt?.department} | 👨‍⚕️ ${appt?.specialist}\n\n` +
        `Please arrive 10 min early. See you soon! 🙏`,
      )
    }

    if (job.name === 'feedback') {
      await sendMessage(phone,
        `⭐ *How was your visit?*\n\n` +
        `Thank you for choosing ${HOSPITAL_NAME}. We'd love your feedback!\n\n` +
        `Reply:\n` +
        `*1* — Excellent\n` +
        `*2* — Good\n` +
        `*3* — Average\n` +
        `*4* — Needs improvement\n\n` +
        `Your feedback helps us serve you better 🙏`,
      )
    }

    if (job.name === 'wellness-recurrence') {
      await sendMessage(phone,
        `💚 *Time for your Wellness Check-up!*\n\n` +
        `Hello! It's been a while since your *${pkgName}* wellness check.\n\n` +
        `Book now at a special price. Reply *BOOK* to continue or *STOP* to unsubscribe.`,
      )
    }
  }, { connection })

  worker.on('failed', (job, err) =>
    console.error(`crm-outbound job failed [${job?.name}]:`, err.message),
  )
}
