import 'dotenv/config'
import express from 'express'
import { verify, receive } from './modules/webhook/webhookController'
import adminRouter from './routes/admin'
import { startCrmWorker } from './modules/crm/crm.queue'
import { startCronWorker } from './modules/crm/cronScheduler'
import { startFollowupWorker } from './modules/followup/followup.worker'

const app = express()

app.use(express.json())

// WhatsApp webhook
app.get('/webhook', verify)
app.post('/webhook', receive)

// Admin API
app.use('/api/admin', adminRouter)

app.listen(3000, () => console.log('🏥 All Is Well Bot running on :3000'))

startCrmWorker()
startCronWorker()
startFollowupWorker()

export default app
