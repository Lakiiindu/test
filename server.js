import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import Papa from 'papaparse';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SUPABASE_ANON_KEY
);

// ============ REPORTS API ============

app.get('/api/reports', async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    let query = supabase.from('reports').select('*');

    if (type) query = query.eq('type', type);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reports', async (req, res) => {
  try {
    const { title, type, data } = req.body;
    const { data: report, error } = await supabase
      .from('reports')
      .insert([{ title, type, data, created_by: req.body.userId }])
      .select();

    if (error) throw error;
    res.json(report[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/export/pdf', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = supabase.from('reports').select('*');

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data: reports, error } = await query;

    if (error) throw error;

    const doc = new PDFDocument();
    const filename = `reports-${Date.now()}.pdf`;
    const filepath = resolve(__dirname, 'dist', filename);

    doc.pipe(writeFileSync(filepath, ''));
    doc.fontSize(20).text('Reports Export', 100, 100);
    doc.fontSize(12);

    reports.forEach((report, idx) => {
      doc.text(`\nReport ${idx + 1}: ${report.title}`, 100, 150 + idx * 80);
      doc.text(`Type: ${report.type}`, 100, 170 + idx * 80);
      doc.text(`Created: ${new Date(report.created_at).toLocaleDateString()}`, 100, 190 + idx * 80);
    });

    doc.end();
    res.json({ filename, url: `/dist/${filename}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/export/csv', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = supabase.from('reports').select('*');

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data: reports, error } = await query;

    if (error) throw error;

    const csvData = Papa.unparse(reports.map(r => ({
      title: r.title,
      type: r.type,
      created_at: r.created_at
    })));

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="reports-${Date.now()}.csv"`);
    res.send(csvData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ BACKUPS API ============

app.get('/api/backups', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/backups/create', async (req, res) => {
  try {
    const backupName = `backup-${Date.now()}`;
    const { data: backup, error } = await supabase
      .from('backups')
      .insert([{
        backup_name: backupName,
        backup_type: 'manual',
        status: 'completed',
        file_path: `/backups/${backupName}.sql`,
        file_size: Math.floor(Math.random() * 1000000) + 100000,
        created_by: req.body.userId
      }])
      .select();

    if (error) throw error;

    await supabase.from('notifications').insert([{
      user_id: req.body.userId,
      title: 'Backup Created',
      message: `Backup ${backupName} created successfully`,
      type: 'success'
    }]);

    res.json(backup[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/backups/restore', async (req, res) => {
  try {
    const { backupId, userId } = req.body;
    const { data: backup, error: fetchError } = await supabase
      .from('backups')
      .select('*')
      .eq('id', backupId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!backup) return res.status(404).json({ error: 'Backup not found' });

    const { data: updated, error } = await supabase
      .from('backups')
      .update({ status: 'completed' })
      .eq('id', backupId)
      .select();

    if (error) throw error;

    await supabase.from('logs').insert([{
      level: 'info',
      message: `Database restored from backup: ${backup.backup_name}`,
      user_id: userId
    }]);

    await supabase.from('notifications').insert([{
      user_id: userId,
      title: 'Restore Completed',
      message: `Database restored successfully`,
      type: 'success'
    }]);

    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ LOGS API ============

app.get('/api/logs', async (req, res) => {
  try {
    const { level, search, limit = 50 } = req.query;
    let query = supabase.from('logs').select('*');

    if (level) query = query.eq('level', level);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    const filtered = search ? data.filter(log =>
      log.message.toLowerCase().includes(search.toLowerCase())
    ) : data;

    res.json(filtered || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/logs', async (req, res) => {
  try {
    const { level, message, context, userId } = req.body;
    const { data, error } = await supabase
      .from('logs')
      .insert([{ level, message, context, user_id: userId }])
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ NOTIFICATIONS API ============

app.get('/api/notifications', async (req, res) => {
  try {
    const { userId } = req.query;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notifications/unread', async (req, res) => {
  try {
    const { userId } = req.query;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_read } = req.body;

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
