const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function getAIRecommendations(demographics) {
  const { age, gender, location, interests, profession, goal } = demographics;

  const prompt = `Sen aqlli tavsiya tizimisan. Foydalanuvchi haqida ma'lumot:
- Yosh: ${age || 'noma\'lum'}
- Jins: ${gender || 'noma\'lum'}
- Joylashuv: ${location || 'noma\'lum'}
- Qiziqishlar: ${Array.isArray(interests) ? interests.join(', ') : (interests || 'noma\'lum')}
- Kasb/Ta\'lim: ${profession || 'noma\'lum'}
- Maqsad: ${goal || 'noma\'lum'}

Ushbu foydalanuvchi uchun 6 ta turli kategoriyalardan aniq va foydali tavsiya ber. Har bir tavsiya quyidagi formatda bo'lsin (JSON array):
[
  {
    "title": "Tavsiya nomi",
    "description": "Nima uchun bu aynan sizga mos, 2-3 gapda aniq tushuntirish",
    "category": "Kategoriya (Kurs/Kitob/Kasb/Ko'nikma/Vosita/Resurs)",
    "why": "Bu foydalanuvchining demografik ma'lumotlariga mos kelishi sababi",
    "link": "https://google.com/search?q=tavsiya+nomi (yoki real havola)",
    "priority": "yuqori/o'rta/past"
  }
]

Faqat JSON array qaytargil, boshqa hech narsa yo'zma. O'zbekcha yoz.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content.trim();
    const jsonStr = content.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    return JSON.parse(jsonStr);
  } catch (err) {
    console.error('OpenAI error:', err.message);
    return [
      {
        title: "Shaxsiy rivojlanish kursi",
        description: "Har doim o'z malakangizni oshirib boring.",
        category: "Kurs",
        why: "Har qanday yosh va kasbdagi odamga mos",
        link: "https://coursera.org",
        priority: "yuqori"
      }
    ];
  }
}

module.exports = { getAIRecommendations };
