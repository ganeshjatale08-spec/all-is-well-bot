import { Router, type Request, type Response, type NextFunction } from 'express'
import { listHandovers, releasePatient } from '../modules/staff/staffController'

const router = Router()

// API-key guard — set STAFF_API_KEY in .env
router.use((req: Request, res: Response, next: NextFunction) => {
  const key = req.headers['x-api-key']
  if (!process.env.STAFF_API_KEY || key === process.env.STAFF_API_KEY) return next()
  res.sendStatus(401)
})

// Handover management
router.get('/handovers',                  listHandovers)   // GET  /api/admin/handovers
router.post('/handovers/:phone/release',  releasePatient)  // POST /api/admin/handovers/:phone/release

export default router
