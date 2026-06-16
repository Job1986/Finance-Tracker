export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY not set' });

  const { image, mimeType } = req.body;
  if (!image) return res.status(400).json({ error: 'No image provided' });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: mimeType || 'image/jpeg',
                  data: image
                }
              },
              {
                text: `นี่คือใบเสร็จหรือสลิปการชำระเงิน กรุณาดึงข้อมูลต่อไปนี้และตอบเป็น JSON เท่านั้น ห้ามมีข้อความอื่นนอกจาก JSON:
{
  "name": "ชื่อร้านค้าหรือรายการสินค้าหลัก (ภาษาไทย ไม่เกิน 40 ตัวอักษร)",
  "amount": ตัวเลขยอดรวมสุทธิ (ตัวเลขเท่านั้น ไม่มีสัญลักษณ์),
  "date": "วันที่ในรูปแบบ YYYY-MM-DD ถ้าไม่พบให้ใส่ null"
}
ถ้าไม่พบข้อมูลใดให้ใส่ null`
              }
            ]
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 256 }
        })
      }
    );

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let parsed = null;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    } catch (e) {}

    if (parsed) {
      return res.status(200).json(parsed);
    } else {
      return res.status(200).json({ name: null, amount: null, date: null });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
