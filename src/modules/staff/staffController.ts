import { type Request, type Response } from 'express'
import { prisma } from '../../db/client'
import { resumeBot } from '../handover/handoverController'

// GET /staff/handovers — list patients currently under human handover
export const listHandovers = async (_req: Request, res: Response) => {
  const patients = await prisma.patient.findMany({
    where:   { is_human_handover: true },
    include: { session: true },
    orderBy: { created_at: 'asc' },
  })

  res.json({
    count: patients.length,
    patients: patients.map((p) => ({
      id:      p.id,
      phone:   p.phone,
      name:    p.name,
      state:   p.session?.state,
      context: p.session?.context,
      since:   p.session?.updated_at,
    })),
  })
}

// POST /staff/handovers/:phone/release — hand control back to bot
export const releasePatient = async (req: Request, res: Response) => {
  const { phone } = req.params

  const patient = await prisma.patient.findUnique({ where: { phone } })
  if (!patient)                  return res.status(404).json({ error: 'Patient not found' })
  if (!patient.is_human_handover) return res.status(400).json({ error: 'Patient is not under handover' })

  await resumeBot(phone)

  res.json({ ok: true, phone })
}
