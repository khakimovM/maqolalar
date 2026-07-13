import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

export interface BackupFile {
  path: string;
  name: string;
  size: number;
  createdAt: Date;
}

/**
 * Ma'lumotlar bazasi (pg_dump) va yuklangan rasmlar (uploads) uchun zaxira.
 *
 * Fayllar BACKUP_DIR (default /app/backups) ichida saqlanadi. Bu papka
 * compose'da host /opt/maqolalar/backups ga bog'langan (bind mount) — shu
 * sabab bot yaratgan va cron yaratgan zaxiralar bir joyda turadi.
 *
 * pg_dump backend image ichida (postgresql16-client) o'rnatilgan bo'lishi
 * kerak; tar/gzip esa alpine (busybox) bilan keladi.
 */
@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly dir = process.env.BACKUP_DIR || '/app/backups';
  private readonly retentionDays = 14;
  private running = false;

  constructor(private readonly config: ConfigService) {
    try {
      fs.mkdirSync(this.dir, { recursive: true });
    } catch {
      /* papka mavjud yoki ruxsat yo'q — createBackup'da qayta urinadi */
    }
  }

  /** Har kuni 02:30 (server vaqti) — avtomatik zaxira. */
  @Cron('30 2 * * *')
  async scheduled(): Promise<void> {
    try {
      const { db, uploads } = await this.createBackup();
      this.logger.log(
        `Rejalashtirilgan backup tayyor: ${db.name}` +
          (uploads ? ` + ${uploads.name}` : ''),
      );
    } catch (e) {
      this.logger.error('Rejalashtirilgan backup xato', e as Error);
    }
  }

  isRunning(): boolean {
    return this.running;
  }

  /** DB dump + uploads arxivini yaratadi va eski zaxiralarni tozalaydi. */
  async createBackup(): Promise<{ db: BackupFile; uploads: BackupFile | null }> {
    if (this.running) throw new Error('Backup allaqachon ketmoqda');
    this.running = true;
    try {
      fs.mkdirSync(this.dir, { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

      const dbPath = path.join(this.dir, `db_${ts}.sql.gz`);
      await this.dumpDb(dbPath);
      const db = this.stat(dbPath);

      let uploads: BackupFile | null = null;
      const uploadsDir = path.resolve(
        process.cwd(),
        process.env.UPLOAD_PATH || 'uploads',
      );
      if (fs.existsSync(uploadsDir) && fs.readdirSync(uploadsDir).length > 0) {
        const upPath = path.join(this.dir, `uploads_${ts}.tar.gz`);
        await this.tarUploads(uploadsDir, upPath);
        uploads = this.stat(upPath);
      }

      this.rotate();
      return { db, uploads };
    } finally {
      this.running = false;
    }
  }

  /** Berilgan turdagi (db|uploads) eng oxirgi zaxira faylini qaytaradi. */
  latest(prefix: 'db' | 'uploads'): BackupFile | null {
    return this.list().find((f) => f.name.startsWith(`${prefix}_`)) ?? null;
  }

  /** Barcha zaxiralar — yangi birinchi. */
  list(): BackupFile[] {
    if (!fs.existsSync(this.dir)) return [];
    return fs
      .readdirSync(this.dir)
      .filter((n) => n.endsWith('.gz'))
      .map((n) => this.stat(path.join(this.dir, n)))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ---- ichki yordamchilar ----

  private stat(p: string): BackupFile {
    const s = fs.statSync(p);
    return { path: p, name: path.basename(p), size: s.size, createdAt: s.mtime };
  }

  private dbConn() {
    const url = this.config.get<string>('DATABASE_URL') || '';
    const u = new URL(url);
    return {
      host: u.hostname,
      port: u.port || '5432',
      user: decodeURIComponent(u.username),
      pass: decodeURIComponent(u.password),
      db: u.pathname.replace(/^\//, ''),
    };
  }

  /** pg_dump → gzip → fayl. pg_dump 0 bilan tugamasa, fayl o'chiriladi. */
  private dumpDb(outPath: string): Promise<void> {
    const c = this.dbConn();
    return new Promise((resolve, reject) => {
      const pg = spawn(
        'pg_dump',
        [
          '-h', c.host,
          '-p', c.port,
          '-U', c.user,
          '-d', c.db,
          '--no-owner',
          '--clean',
          '--if-exists',
        ],
        { env: { ...process.env, PGPASSWORD: c.pass } },
      );

      const out = fs.createWriteStream(outPath);
      const gz = zlib.createGzip();
      let stderr = '';
      let pgClosed = false;
      let fileClosed = false;
      let pgCode: number | null = null;

      const settle = () => {
        if (!pgClosed || !fileClosed) return;
        if (pgCode === 0) {
          resolve();
        } else {
          fs.rm(outPath, { force: true }, () => undefined);
          reject(new Error(`pg_dump exit ${pgCode}: ${stderr.slice(0, 500)}`));
        }
      };

      pg.on('error', (e) =>
        reject(
          new Error(
            `pg_dump ishga tushmadi (postgresql-client o'rnatilganmi?): ${e.message}`,
          ),
        ),
      );
      pg.stderr.on('data', (d) => (stderr += d.toString()));
      out.on('error', reject);
      gz.on('error', reject);
      out.on('close', () => {
        fileClosed = true;
        settle();
      });
      pg.on('close', (code) => {
        pgClosed = true;
        pgCode = code ?? 1;
        settle();
      });

      pg.stdout.pipe(gz).pipe(out);
    });
  }

  /** uploads papkasini gzip'langan tar arxivga yig'adi. */
  private tarUploads(dir: string, outPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tar = spawn('tar', ['-czf', outPath, '-C', dir, '.']);
      let stderr = '';
      tar.stderr.on('data', (d) => (stderr += d.toString()));
      tar.on('error', reject);
      tar.on('close', (code) => {
        if (code === 0) return resolve();
        fs.rm(outPath, { force: true }, () => undefined);
        reject(new Error(`tar exit ${code}: ${stderr.slice(0, 300)}`));
      });
    });
  }

  /** retentionDays'dan eski zaxiralarni o'chiradi. */
  private rotate(): void {
    const cutoff = Date.now() - this.retentionDays * 86_400_000;
    for (const f of this.list()) {
      if (f.createdAt.getTime() < cutoff) {
        try {
          fs.rmSync(f.path, { force: true });
        } catch (e) {
          this.logger.warn(`Eski backup o'chmadi (${f.name}): ${String(e)}`);
        }
      }
    }
  }
}
