import { ChatSession, Patient } from '@prisma/client'
import { sendMessage } from '../whatsapp/client'
import { EMERGENCY_KEYWORDS, DEPT_MAP, PACKAGE_MAP } from '../../config/constants'
import {
  buildMainMenu,
  buildPackagesMenu,
  buildDeptMenu,
  buildLocationInfo,
  buildBookingConfirm,
  buildEmergencyAlert,
  buildPackageDetail,
  buildProfileView,
} from './messageBuilder'
import { prisma } from '../../db/client'
import { logger } from '../../utils/logger'
import { enqueueCrmJob } from '../crm/crm.queue'
import { scheduleBookingJobs, scheduleWellnessRecurrence } from '../crm/cronScheduler'
import { STATE, HOSPITAL_PHONE } from '../../config/constants'
import { triggerHandover } from '../handover/handoverController'

export async function handleMessage(
  phone: string,
  text: string,
  session: ChatSession,
  patient: Patient,
): Promise<void> {
  const msg = text.trim().toLowerCase()

  // ─── EMERGENCY CHECK (always first) ───────────────────────────────────────
  if (EMERGENCY_KEYWORDS.some((k) => msg.includes(k))) {
    await sendMessage(phone, buildEmergencyAlert())
    return
  }

  // ─── HUMAN HANDOVER (bot is silenced) ─────────────────────────────────────
  if (patient.is_human_handover) return

  // ─── STATE ROUTER ──────────────────────────────────────────────────────────
  switch (session.state) {
    case STATE.MAIN_MENU: {
      if (msg === '1') return transition(session, STATE.SELECT_DEPT, phone, buildDeptMenu())
      if (msg === '2') return transition(session, STATE.PACKAGES_MENU, phone, buildPackagesMenu())
      if (msg === '3') return transition(session, STATE.INFO_SHOWN, phone, buildLocationInfo())
      if (msg === '4') {
        await triggerHandover(phone, patient.id)
        await prisma.chatSession.update({ where: { id: session.id }, data: { state: STATE.AWAITING_AGENT } })
        return
      }
      if (msg === '5') return transition(session, STATE.MY_PROFILE, phone,
        buildProfileView(patient.name, patient.contact_phone, patient.address))
      return sendMessage(phone, buildMainMenu())
    }

    case STATE.INFO_SHOWN: {
      return transition(session, STATE.MAIN_MENU, phone, buildMainMenu())
    }

    case STATE.SELECT_DEPT: {
      const dept = DEPT_MAP[msg]
      if (!dept) return sendMessage(phone, '❓ Please reply with a valid department number.')
      await updateContext(session, { dept })
      return transition(
        session,
        STATE.COLLECT_NAME,
        phone,
        `Great! You selected *${dept.name}* with *${dept.specialist}*.\n\nPlease reply with your *full name*:`,
      )
    }

    case STATE.COLLECT_NAME: {
      await updateContext(session, { name: text.trim() })
      return transition(
        session,
        STATE.COLLECT_DATE,
        phone,
        `Thanks, *${text.trim()}*! 📅\n\nPlease reply with your preferred date:\n_(e.g. 15 June or 15/06)_`,
      )
    }

    case STATE.COLLECT_DATE: {
      const date = parseDate(text)
      if (!date) return sendMessage(phone, '❓ Could not read that date. Please try again (e.g. 15 June).')
      if (date < new Date()) return sendMessage(phone, '❓ That date is in the past. Please enter a future date.')
      await updateContext(session, { date: date.toISOString() })
      const ctx = session.context as Record<string, unknown>
      return transition(session, STATE.CONFIRM_BOOKING, phone, buildBookingConfirm(ctx as Parameters<typeof buildBookingConfirm>[0]))
    }

    case STATE.CONFIRM_BOOKING: {
      if (msg === 'y' || msg === 'yes' || msg === '1') {
        await finalizeBooking(session, patient)
        return transition(
          session,
          STATE.DONE,
          phone,
          `✅ *Booking Confirmed!*\nWe'll send a reminder 24h before your appointment.\n\nFor emergencies: *${HOSPITAL_PHONE}*`,
        )
      }
      return transition(session, STATE.MAIN_MENU, phone, `No problem! Let me know if you'd like to try again.\n\n${buildMainMenu()}`)
    }

    case STATE.PACKAGES_MENU: {
      if (msg === '0') return transition(session, STATE.MAIN_MENU, phone, buildMainMenu())
      const pkg = PACKAGE_MAP[msg]
      if (!pkg) return sendMessage(phone, '❓ Please reply with 21–26 or 0 for main menu.')
      await updateContext(session, { pkg })
      return transition(session, STATE.PACKAGE_DETAIL, phone, buildPackageDetail(pkg))
    }

    case STATE.PACKAGE_DETAIL: {
      if (msg === 'book' || msg === '1') {
        return transition(session, STATE.COLLECT_NAME, phone, `📋 Let's book this package!\n\nPlease reply with your *full name*:`)
      }
      if (msg === '0') return transition(session, STATE.PACKAGES_MENU, phone, buildPackagesMenu())
      return sendMessage(phone, 'Reply *1* to book or *0* to go back.')
    }

    case STATE.MY_PROFILE: {
      if (msg === '1') return transition(session, STATE.EDIT_NAME,    phone, `📛 Enter your new *full name*:`)
      if (msg === '2') return transition(session, STATE.EDIT_PHONE,   phone, `📞 Enter your new *contact number*:`)
      if (msg === '3') return transition(session, STATE.EDIT_ADDRESS, phone, `🏠 Enter your *home / billing address*:`)
      if (msg === '0') return transition(session, STATE.MAIN_MENU,    phone, buildMainMenu())
      return sendMessage(phone, buildProfileView(patient.name, patient.contact_phone, patient.address))
    }

    case STATE.EDIT_NAME: {
      await prisma.patient.update({ where: { id: patient.id }, data: { name: text.trim() } })
      const updated = await prisma.patient.findUniqueOrThrow({ where: { id: patient.id } })
      return transition(session, STATE.MY_PROFILE, phone,
        `✅ Name updated!\n\n${buildProfileView(updated.name, updated.contact_phone, updated.address)}`)
    }

    case STATE.EDIT_PHONE: {
      await prisma.patient.update({ where: { id: patient.id }, data: { contact_phone: text.trim() } })
      const updated = await prisma.patient.findUniqueOrThrow({ where: { id: patient.id } })
      return transition(session, STATE.MY_PROFILE, phone,
        `✅ Phone updated!\n\n${buildProfileView(updated.name, updated.contact_phone, updated.address)}`)
    }

    case STATE.EDIT_ADDRESS: {
      await prisma.patient.update({ where: { id: patient.id }, data: { address: text.trim() } })
      const updated = await prisma.patient.findUniqueOrThrow({ where: { id: patient.id } })
      return transition(session, STATE.MY_PROFILE, phone,
        `✅ Address updated!\n\n${buildProfileView(updated.name, updated.contact_phone, updated.address)}`)
    }

    default: {
      return transition(session, STATE.MAIN_MENU, phone, buildMainMenu())
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function transition(
  session: ChatSession,
  newState: string,
  phone: string,
  message: string,
): Promise<void> {
  await prisma.chatSession.update({ where: { id: session.id }, data: { state: newState } })
  session.state = newState
  await sendMessage(phone, message)
}

async function updateContext(
  session: ChatSession,
  patch: Record<string, unknown>,
): Promise<void> {
  const merged = { ...((session.context as Record<string, unknown>) ?? {}), ...patch }
  await prisma.chatSession.update({ where: { id: session.id }, data: { context: merged } })
  ;(session as { context: unknown }).context = merged
}

async function finalizeBooking(session: ChatSession, patient: Patient): Promise<void> {
  const ctx = (session.context ?? {}) as Record<string, any>
  const name = (ctx.name as string) ?? patient.name ?? ''

  const appt = await prisma.appointment.create({
    data: {
      patient_id: patient.id,
      department: ctx.dept?.code ?? ctx.pkg?.name ?? 'GENERAL',
      specialist: ctx.dept?.specialist ?? 'TBD',
      appt_date:  new Date(ctx.date),
      pkg_name:   ctx.pkg?.name ?? null,
    },
  })

  // Persist name collected during booking back to the patient record
  if (name && !patient.name) {
    await prisma.patient.update({ where: { id: patient.id }, data: { name } })
  }

  // Delay-based WhatsApp follow-ups (confirmation → reminder → feedback)
  await scheduleBookingJobs(appt.id, patient.phone, appt.appt_date)

  // Schedule wellness recurrence if this was a package booking
  if (ctx.pkg?.name) {
    await scheduleWellnessRecurrence(patient.phone, ctx.pkg.name)
  }

  await enqueueCrmJob({
    patientId:  patient.id,
    phone:      patient.phone,
    name,
    department: ctx.dept?.name ?? ctx.pkg?.name ?? 'General',
    specialist: ctx.dept?.specialist ?? 'TBD',
    apptDate:   new Date(ctx.date).toISOString(),
    pkgName:    ctx.pkg?.name ?? null,
  })

  logger.info('Booking finalised', { patientId: patient.id, apptId: appt.id })
}


function parseDate(text: string): Date | null {
  const MONTHS: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  }

  // DD/MM or DD-MM or DD/MM/YYYY
  const slashMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/)
  if (slashMatch) {
    const d = new Date(
      slashMatch[3] ? parseInt(slashMatch[3]) : new Date().getFullYear(),
      parseInt(slashMatch[2]) - 1,
      parseInt(slashMatch[1]),
    )
    if (!isNaN(d.getTime())) return d
  }

  // "15 June" or "15june"
  const wordMatch = text.match(/(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i)
  if (wordMatch) {
    const d = new Date(
      new Date().getFullYear(),
      MONTHS[wordMatch[2].toLowerCase()],
      parseInt(wordMatch[1]),
    )
    if (!isNaN(d.getTime())) return d
  }

  return null
}

function reminderTime(apptDate: Date): Date {
  return new Date(apptDate.getTime() - 24 * 60 * 60 * 1000)
}

function feedbackTime(apptDate: Date): Date {
  return new Date(apptDate.getTime() + 4 * 60 * 60 * 1000)
}
