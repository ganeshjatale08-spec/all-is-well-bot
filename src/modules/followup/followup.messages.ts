import { type Appointment, type FollowUpQueue, type Patient } from '@prisma/client'
import { HOSPITAL_NAME, HOSPITAL_PHONE } from '../../config/constants'

type FollowUpWithRefs = FollowUpQueue & {
  patient:     Patient
  appointment: Appointment | null
}

export function buildFollowUpMessage(item: FollowUpWithRefs): string {
  const { type, patient, appointment } = item
  const name    = patient.name ?? 'there'
  const dept    = appointment?.department ?? 'your department'
  const apptDate = appointment?.appt_date ? new Date(appointment.appt_date) : null

  switch (type) {
    case 'BOOKING_CONFIRMATION': {
      const dateStr = apptDate
        ? apptDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : 'the scheduled date'
      return (
        `✅ *Booking Confirmed!*\n\n` +
        `Hi ${name}, your appointment at *${HOSPITAL_NAME}* is confirmed:\n\n` +
        `🏥 *${dept}*\n` +
        `📅 ${dateStr}\n\n` +
        `Please arrive 15 minutes early and carry a valid photo ID.\n` +
        `📞 Questions? Call *${HOSPITAL_PHONE}*`
      )
    }

    case 'REMINDER_24H': {
      const timeStr = apptDate
        ? apptDate.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
        : 'tomorrow'
      return (
        `⏰ *Appointment Reminder*\n\n` +
        `Hi ${name}, your appointment is *tomorrow*:\n\n` +
        `🏥 *${dept}*\n` +
        `📅 ${timeStr}\n\n` +
        `• Carry a valid photo ID\n` +
        `• Bring previous medical records if any\n` +
        `• Fast for 8h if blood tests are included\n\n` +
        `Need to reschedule? Call *${HOSPITAL_PHONE}*`
      )
    }

    case 'FEEDBACK_4H': {
      return (
        `⭐ *How was your visit?*\n\n` +
        `Hi ${name}, we hope your appointment at *${HOSPITAL_NAME}* went smoothly!\n\n` +
        `Please rate your experience:\n\n` +
        `5️⃣  Excellent\n` +
        `4️⃣  Good\n` +
        `3️⃣  Average\n` +
        `2️⃣  Below Average\n` +
        `1️⃣  Poor\n\n` +
        `Reply with a number (1–5). Your feedback helps us improve. 🙏`
      )
    }

    case 'WELLNESS_RECURRENCE': {
      const pkg = appointment?.pkg_name ?? 'your last wellness package'
      return (
        `💊 *Time for your Wellness Check!*\n\n` +
        `Hi ${name}, it's been a while since your *${pkg}* at *${HOSPITAL_NAME}*.\n\n` +
        `Regular health check-ups enable early detection and prevention.\n\n` +
        `Reply *1* to book again or call *${HOSPITAL_PHONE}*`
      )
    }
  }
}
