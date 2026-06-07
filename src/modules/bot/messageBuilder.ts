import {
  DEPT_MAP, PACKAGE_MAP,
  HOSPITAL_NAME, HOSPITAL_PHONE, HOSPITAL_ADDRESS, HOSPITAL_HOURS,
  type DeptEntry, type PkgEntry,
} from '../../config/constants'

export function buildMainMenu(): string {
  return (
    `🏥 *${HOSPITAL_NAME} — How can we help you?*\n\n` +
    `1️⃣  Book a Department Appointment\n` +
    `2️⃣  Wellness Packages\n` +
    `3️⃣  Location & Timings\n` +
    `4️⃣  Talk to our Team\n` +
    `5️⃣  My Profile\n\n` +
    `_Reply with 1, 2, 3, 4, or 5_`
  )
}

export function buildProfileView(name?: string | null, phone?: string | null, address?: string | null): string {
  return (
    `👤 *My Profile*\n\n` +
    `📛 Name:    ${name    ?? '_Not set_'}\n` +
    `📞 Phone:   ${phone   ?? '_Not set_'}\n` +
    `🏠 Address: ${address ?? '_Not set_'}\n\n` +
    `What would you like to edit?\n\n` +
    `1️⃣  Edit Name\n` +
    `2️⃣  Edit Phone Number\n` +
    `3️⃣  Edit Address\n` +
    `0️⃣  Back to Main Menu`
  )
}

export function buildDeptMenu(): string {
  const lines = Object.entries(DEPT_MAP)
    .map(([key, d]) => `${key}️⃣  ${d.name} — _${d.specialist}_`)
    .join('\n')
  return `🏥 *Select a Department:*\n\n${lines}\n\n_Reply with the number_`
}

export function buildPackagesMenu(): string {
  const lines = Object.entries(PACKAGE_MAP)
    .map(([key, p]) => {
      const discount = p.originalPrice > p.price
        ? ` _(${Math.round((1 - p.price / p.originalPrice) * 100)}% OFF)_`
        : ''
      return `*${key}*  ${p.emoji} ${p.name} — ₹${p.price.toLocaleString('en-IN')}${discount}`
    })
    .join('\n')
  return (
    `💊 *Wellness Packages:*\n\n${lines}\n\n` +
    `_Reply with the package number to see details, or *0* for main menu_`
  )
}

export function buildPackageDetail(pkg: PkgEntry): string {
  const priceStr = pkg.originalPrice > pkg.price
    ? `₹${pkg.price.toLocaleString('en-IN')} _(was ₹${pkg.originalPrice.toLocaleString('en-IN')} — ${Math.round((1 - pkg.price / pkg.originalPrice) * 100)}% OFF!)_`
    : `₹${pkg.price.toLocaleString('en-IN')}`

  return (
    `${pkg.emoji} *${pkg.name}*\n\n` +
    `💰 ${priceStr}\n\n` +
    `✅ Tests included:\n${pkg.tests.map((t) => `• ${t}`).join('\n')}\n\n` +
    `Reply *1* to Book this package\nReply *0* to go back`
  )
}

export function buildLocationInfo(): string {
  return (
    `📍 *${HOSPITAL_NAME}*\n\n` +
    `🏠 ${HOSPITAL_ADDRESS}\n` +
    `🕘 OPD Hours: ${HOSPITAL_HOURS}\n` +
    `🚨 Emergency: 24 × 7\n` +
    `📞 *${HOSPITAL_PHONE}*\n\n` +
    `_Reply with any key to return to the main menu_`
  )
}

export function buildBookingConfirm(ctx: {
  name?: string
  dept?: DeptEntry
  pkg?:  PkgEntry
  date?: string | Date
}): string {
  const what       = ctx.pkg ? `Wellness Package: *${ctx.pkg.name}*` : `Department: *${ctx.dept?.name}*`
  const specialist = ctx.dept ? `\n👨‍⚕️ Specialist: ${ctx.dept.specialist}` : ''
  const date       = ctx.date
    ? new Date(ctx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'TBD'

  return (
    `📝 *Booking Summary*\n\n` +
    `👤 Name: *${ctx.name ?? '—'}*\n` +
    `${what}${specialist}\n` +
    `📅 Date: *${date}*\n\n` +
    `Reply *1* or *yes* to confirm\nReply *0* to cancel`
  )
}

export function buildEmergencyAlert(): string {
  return (
    `🚨 *EMERGENCY DETECTED*\n\n` +
    `Please call our 24/7 Emergency Line immediately:\n` +
    `📞 *${HOSPITAL_PHONE}*\n\n` +
    `Do NOT wait — call now.\n` +
    `*${HOSPITAL_NAME}, Burhanpur*`
  )
}
