import { prisma } from '../../db/client'
import { sendMessage } from '../whatsapp/client'
import { buildMainMenu } from '../bot/messageBuilder'
import { HOSPITAL_PHONE, HOSPITAL_EMAIL, STATE } from '../../config/constants'

// Trigger handover (called when patient replies "4")
export async function triggerHandover(phone: string, patientId: string) {
  await prisma.patient.update({
    where: { id: patientId },
    data:  { is_human_handover: true },
  })

  await sendMessage(phone,
    `👤 *Connecting you to our team...*\n\n` +
    `A hospital representative will message you shortly.\n\n` +
    `For urgent help: *${HOSPITAL_PHONE}*\n` +
    `Email: ${HOSPITAL_EMAIL}`,
  )

  // TODO: Notify staff via Slack / internal dashboard alert
}

// Admin endpoint — resume bot after staff is done
export async function resumeBot(phone: string) {
  const patient = await prisma.patient.update({
    where: { phone },
    data:  { is_human_handover: false },
  })

  // Reset session so next message lands on a clean MAIN_MENU
  await prisma.chatSession.updateMany({
    where: { patient_id: patient.id },
    data:  { state: STATE.MAIN_MENU, context: {} },
  })

  await sendMessage(phone,
    `🤖 You're back with our automated assistant!\n\n${buildMainMenu()}`,
  )

  return patient
}
