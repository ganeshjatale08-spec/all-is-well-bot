import axios from 'axios'
import { logger } from '../../utils/logger'

export interface CrmPayload {
  patientId:  string
  phone:      string
  name:       string
  department: string
  specialist: string
  apptDate:   string
  pkgName:    string | null
}

export async function processCrmJob(payload: CrmPayload): Promise<void> {
  const webhookUrl = process.env.CRM_WEBHOOK_URL
  if (!webhookUrl) {
    logger.info('CRM lead (no webhook configured)', payload)
    return
  }

  const apiKey = process.env.CRM_API_KEY
  await axios.post(
    webhookUrl,
    { source: 'whatsapp-bot', timestamp: new Date().toISOString(), ...payload },
    {
      headers: apiKey ? { 'x-api-key': apiKey } : {},
      timeout: 10_000,
    },
  )

  logger.info('CRM lead sent', { patientId: payload.patientId })
}
