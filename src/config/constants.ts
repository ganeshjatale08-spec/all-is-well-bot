// ─── Hospital info ─────────────────────────────────────────────────────────────

export const HOSPITAL_NAME    = 'All is Well Hospital'
export const HOSPITAL_PHONE   = '+91 7697744444'
export const HOSPITAL_EMAIL   = 'digitalmarketing@mvaburhanpur.com'
export const HOSPITAL_ADDRESS = 'Burhanpur, Madhya Pradesh'
export const HOSPITAL_HOURS   = 'Mon – Sat, 9 AM – 8 PM'

// ─── Bot states ────────────────────────────────────────────────────────────────

export const STATE = {
  MAIN_MENU:        'MAIN_MENU',
  INFO_SHOWN:       'INFO_SHOWN',
  SELECT_DEPT:      'SELECT_DEPT',
  PACKAGES_MENU:    'PACKAGES_MENU',
  PACKAGE_DETAIL:   'PACKAGE_DETAIL',
  COLLECT_NAME:     'COLLECT_NAME',
  COLLECT_DATE:     'COLLECT_DATE',
  CONFIRM_BOOKING:  'CONFIRM_BOOKING',
  AWAITING_AGENT:   'AWAITING_AGENT',
  DONE:             'DONE',
  MY_PROFILE:       'MY_PROFILE',
  EDIT_NAME:        'EDIT_NAME',
  EDIT_PHONE:       'EDIT_PHONE',
  EDIT_ADDRESS:     'EDIT_ADDRESS',
} as const

export type BotState = typeof STATE[keyof typeof STATE]

// ─── Emergency keywords ────────────────────────────────────────────────────────

export const EMERGENCY_KEYWORDS = [
  // English
  'emergency', 'urgent', 'ambulance', 'critical', 'accident',
  'heart attack', 'stroke', 'unconscious', 'bleeding', 'seizure',
  // Numeric helplines
  '108', '112',
  // Hindi
  'acchanak', 'haadsa', 'behosh', 'khoon',
  // Marathi
  'apatkalin', 'evarje',
]

// ─── Department map ────────────────────────────────────────────────────────────

export interface DeptEntry {
  name:       string
  specialist: string
  code:       string
}

export const DEPT_MAP: Record<string, DeptEntry> = {
  '1': { name: 'General Medicine',    specialist: 'General Physician',      code: 'GENERAL'    },
  '2': { name: 'Cardiology',          specialist: 'Cardiologist',           code: 'CARDIOLOGY' },
  '3': { name: 'Orthopaedics',        specialist: 'Orthopaedic Surgeon',    code: 'ORTHO'      },
  '4': { name: 'Gynaecology & OB',    specialist: 'Gynaecologist',          code: 'GYNAE'      },
  '5': { name: 'Paediatrics',         specialist: 'Paediatrician',          code: 'PAEDS'      },
  '6': { name: 'Dermatology',         specialist: 'Dermatologist',          code: 'DERMA'      },
  '7': { name: 'ENT',                 specialist: 'ENT Specialist',         code: 'ENT'        },
  '8': { name: 'Ophthalmology',       specialist: 'Eye Specialist',         code: 'OPHTHA'     },
  '9': { name: 'Neurology',           specialist: 'Neurologist',            code: 'NEURO'      },
}

// ─── Wellness package map ──────────────────────────────────────────────────────

export interface PkgEntry {
  name:          string
  emoji:         string
  price:         number
  originalPrice: number   // for discount display
  tests:         string[]
}

export const PACKAGE_MAP: Record<string, PkgEntry> = {
  '21': {
    name:          'Basic Wellness Package',
    emoji:         '🩺',
    price:         899,
    originalPrice: 1550,
    tests: [
      'CBC', 'Blood Sugar (Random)', 'ECG', 'SGPT', 'Serum Calcium',
      'Serum Creatinine', 'HbA1c', 'Urine Analysis', 'Total Cholesterol',
      'Physician Consultation',
    ],
  },
  '22': {
    name:          'Full Body Checkup',
    emoji:         '💊',
    price:         2499,
    originalPrice: 2499,
    tests: ['CBC', 'LFT', 'KFT', 'Lipid Profile', 'Thyroid (TSH)', 'X-Ray Chest'],
  },
  '23': {
    name:          'Cardiac Package',
    emoji:         '❤️',
    price:         3499,
    originalPrice: 3499,
    tests: ['ECG', '2D Echo', 'Troponin I', 'Lipid Profile', 'CRP'],
  },
  '24': {
    name:          'Diabetes Care',
    emoji:         '🩸',
    price:         1499,
    originalPrice: 1499,
    tests: ['HbA1c', 'FBS', 'PPBS', 'Urine Microalbumin', 'Creatinine'],
  },
  '25': {
    name:          "Women's Wellness",
    emoji:         '🌸',
    price:         2999,
    originalPrice: 2999,
    tests: ['Pap Smear', 'Mammography', 'Thyroid Panel', 'Vitamin D', 'Calcium'],
  },
  '26': {
    name:          'Senior Citizen Care',
    emoji:         '👴',
    price:         3999,
    originalPrice: 3999,
    tests: ['Full Body', 'Bone Density (DEXA)', 'Eye Check', 'ECG', 'PSA / CA-125'],
  },
}
