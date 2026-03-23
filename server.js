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
// Если public не существует - раздаём из корня
const STATIC_DIR = fs.existsSync(PUBLIC_DIR) ? PUBLIC_DIR : __dirname;
console.log('Using STATIC_DIR:', STATIC_DIR);
app.use(express.static(STATIC_DIR));

// Supabase клиент
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

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
      details
    } = req.body;
    
    // Валидация
    if (!amount || !bank || !recipient || (!cardNumber && !details)) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }

    // Генерация токена (формат: DEAL-XXXXXX-XXXXXX)
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart1 = '';
    let randomPart2 = '';
    for (let i = 0; i < 6; i++) {
      randomPart1 += characters.charAt(Math.floor(Math.random() * characters.length));
      randomPart2 += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const token = `DEAL-${randomPart1}-${randomPart2}`;

    // Сохранение в базу
    const { data, error } = await supabase
      .from('deals')
      .insert([
        {
          token: token,
          amount: amount,
          bank: bank,
          bank_id: bankId,
          bank_logo: bankLogo,
          recipient: recipient,
          recipient_short: recipient.split(' ')[0] + ' ' + (recipient.split(' ')[1]?.[0] || '') + '.',
          card_number: cardNumber,
          details: details || cardNumber,
          method: method || 'card',
          country: country || 'russia',
          currency: currency || 'RUB',
          currency_symbol: currencySymbol || '₽',
          status: 'active',
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Ошибка базы данных' });
    }

    // Возвращаем ссылку
    res.json({
      success: true,
      link: `/deal/${token}`,
      token: token,
      deal: data[0]
    });

  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({ error: 'Ошибка при создании сделки' });
  }
});

// Получение сделки по токену
app.get('/api/deal/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('token', token)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Сделка не найдена' });
    }

    res.json(data);

  } catch (error) {
    console.error('Error fetching deal:', error);
    res.status(500).json({ error: 'Ошибка при получении сделки' });
  }
});

// Получение всех сделок (без авторизации пока)
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
    console.error('Error fetching deals:', error);
    res.status(500).json({ error: 'Ошибка при получении сделок' });
  }
});

// Получение сделок пользователя (по sessionId - упрощенно)
app.get('/api/my-deals', async (req, res) => {
  try {
    const { sessionId } = req.query;
    
    if (!sessionId) {
      return res.json([]);
    }

    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);

  } catch (error) {
    console.error('Error fetching my deals:', error);
    res.status(500).json({ error: 'Ошибка при получении сделок' });
  }
});

// Обновление статуса сделки (оплата)
app.patch('/api/deal/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { status, paymentData } = req.body;

    const { data, error } = await supabase
      .from('deals')
      .update({ 
        status: status,
        payment_data: paymentData,
        updated_at: new Date().toISOString()
      })
      .eq('token', token)
      .select();

    if (error) throw error;

    res.json({ success: true, deal: data[0] });

  } catch (error) {
    console.error('Error updating deal:', error);
    res.status(500).json({ error: 'Ошибка при обновлении сделки' });
  }
});

// Удаление сделки
app.delete('/api/deal/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('token', token);

    if (error) throw error;

    res.json({ success: true });

  } catch (error) {
    console.error('Error deleting deal:', error);
    res.status(500).json({ error: 'Ошибка при удалении сделки' });
  }
});

// ========== FALLBACK ДЛЯ SPA ==========
// Все остальные запросы отдаем index.html
app.get('*', (req, res) => {
  const indexFromPublic = path.join(__dirname, 'public', 'index.html');
  const indexFromRoot = path.join(__dirname, 'index.html');
  const indexPath = fs.existsSync(indexFromPublic) ? indexFromPublic : indexFromRoot;
  console.log('Serving index from:', indexPath);
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Supabase URL: ${process.env.SUPABASE_URL}`);
});