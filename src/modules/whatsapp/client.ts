const BASE_URL = `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`

export async function sendMessage(to: string, body: string): Promise<void> {
  await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { preview_url: false, body },
    }),
  })
}
