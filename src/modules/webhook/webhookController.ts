import { Request, Response } from 'express'
import { prisma } from '../../db/client'
import { handleMessage } from '../bot/stateMachine'
import { STATE } from '../../config/constants'

// GET — Meta webhook verification
export const verify = (req: Request, res: Response) => {
  const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN
  if (req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge'])
  } else {
    res.sendStatus(403)
  }
}

// POST — Incoming messages
export const receive = async (req: Request, res: Response) => {
  res.sendStatus(200) // Always ACK immediately (Meta requires < 5s)

  try {
    const entry = req.body?.entry?.[0]?.changes?.[0]?.value
    const msg   = entry?.messages?.[0]

    if (!msg || msg.type !== 'text') return

    const phone = msg.from
    const text  = msg.text?.body || ''

    // Upsert patient
    const patient = await prisma.patient.upsert({
      where:  { phone },
      create: { phone },
      update: {},
    })

    // If staff has taken over, ignore bot
    if (patient.is_human_handover) return

    // Upsert session (1 active session per patient)
    const session = await prisma.chatSession.upsert({
      where:  { patient_id: patient.id },
      create: { patient_id: patient.id, state: STATE.MAIN_MENU },
      update: {},
    })

    await handleMessage(phone, text, session, patient)
  } catch (err) {
    console.error('Webhook error:', err)
  }
}
