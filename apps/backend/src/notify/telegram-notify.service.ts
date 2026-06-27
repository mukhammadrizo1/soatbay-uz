import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Api, InputFile } from 'grammy';
import {
  sanitizeTelegramError,
  telegramFetch,
  telegramProxyUrl,
} from './telegram-fetch';

export type BotWhich = 'employer' | 'worker';
export type MediaKind = 'photo' | 'video';

/**
 * Telegram/tarmoq xatosini chuqurroq ochadi. grammY `HttpError` asl xatoni
 * `.error` da, Node `fetch failed` esa haqiqiy errno ni `.cause` da saqlaydi —
 * shu zanjirni yig'ib, aniq sabab (ETIMEDOUT/ECONNRESET/ENOTFOUND/...) chiqaramiz.
 */
function describeError(err: unknown): string {
  const parts: string[] = [];
  let cur: unknown = err;
  const seen = new Set<unknown>();
  for (let depth = 0; cur && depth < 6 && !seen.has(cur); depth++) {
    seen.add(cur);
    const e = cur as {
      name?: string;
      message?: string;
      code?: string;
      errno?: number;
      error?: unknown;
      cause?: unknown;
    };
    const label = [e.name, e.code ? `(${e.code})` : '', e.message]
      .filter(Boolean)
      .join(' ');
    if (label.trim()) parts.push(sanitizeTelegramError(label.trim()));
    cur = e.error ?? e.cause;
  }
  return parts.length ? parts.join(' <- ') : sanitizeTelegramError(String(err));
}

function guessContentType(filePath: string): string | null {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'pdf':
      return 'application/pdf';
    default:
      return null;
  }
}

/**
 * Backend dan foydalanuvchilarga Telegram xabarlarini yuboradi (masalan admin
 * tasdig'i yoki rad etishida). Bot tokenlaridan qurilgan xom grammY `Api`
 * nusxalaridan foydalanadi, shu sababli ham employer-bot, ham worker-bot
 * foydalanuvchilariga xabar yubora oladi.
 */
@Injectable()
export class TelegramNotifyService implements OnModuleInit {
  private readonly logger = new Logger(TelegramNotifyService.name);
  // Lazy keshlar: tokenlar process.env ga yuklangach (ConfigModule bootstrap),
  // birinchi chaqiruvda Api nusxasi quriladi. Bu env yuklanish tartibiga bog'liq
  // bo'lgan muammolarni (cwd noto'g'ri => token undefined) oldini oladi.
  private apis: Partial<Record<BotWhich, Api>> = {};

  onModuleInit(): void {
    const proxy = telegramProxyUrl();
    if (proxy) {
      this.logger.log(`Telegram proxy: ${sanitizeTelegramError(proxy)}`);
    } else {
      this.logger.warn(
        'Telegram proxy yo\'q (TELEGRAM_PROXY). api.telegram.org bloklangan tarmoqlarda suratlar yuklanmaydi.',
      );
    }
  }

  /** process.env dan tokenni o'qiydi; placeholder/bo'sh bo'lsa undefined. */
  private tokenFor(which: BotWhich): string | undefined {
    const t =
      which === 'employer'
        ? process.env.EMPLOYER_BOT_TOKEN
        : process.env.WORKER_BOT_TOKEN;
    if (!t || t.startsWith('000000000')) return undefined;
    return t;
  }

  /**
   * Telegram API ildizi. Telegram to'g'ridan-to'g'ri ochilmaydigan tarmoqlarda
   * `TELEGRAM_API_ROOT` (masalan o'rnatilgan reverse-proxy / local Bot API
   * server) orqali yo'naltirish mumkin. Standart: https://api.telegram.org
   */
  private apiRoot(): string {
    return (process.env.TELEGRAM_API_ROOT ?? 'https://api.telegram.org').replace(
      /\/$/,
      '',
    );
  }

  /** Kerakli botning grammY Api nusxasini lazy quradi va keshlaydi. */
  private apiFor(which: BotWhich): Api | undefined {
    const token = this.tokenFor(which);
    if (!token) return undefined;
    if (!this.apis[which]) {
      this.apis[which] = new Api(token, {
        apiRoot: this.apiRoot(),
        fetch: telegramFetch as unknown as typeof fetch,
      } as unknown as ConstructorParameters<typeof Api>[1]);
    }
    return this.apis[which];
  }

  private get employerApi(): Api | undefined {
    return this.apiFor('employer');
  }

  private get workerApi(): Api | undefined {
    return this.apiFor('worker');
  }

  /**
   * Telegram faylini (passport surati, to'lov cheki, skrinshot, …) file_id
   * orqali yuklab oladi, shunda admin panel uni ko'rsata oladi. Xom baytlar va
   * imkon qadar aniqlangan content type ni, yuklab bo'lmasa null qaytaradi.
   */
  async getFile(
    which: 'employer' | 'worker',
    fileId: string,
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    const api = this.apiFor(which);
    const token = this.tokenFor(which);
    if (!api || !token) {
      this.logger.warn(`[${which}] getFile skipped (token not configured)`);
      return null;
    }
    // Telegram ba'zan tarmoq xatosi qaytaradi — bir necha marta urinib ko'ramiz.
    const ATTEMPTS = 3;
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      try {
        const file = await api.getFile(fileId);
        if (!file.file_path) return null;
        const url = `${this.apiRoot()}/file/bot${token}/${file.file_path}`;
        const res = await this.fetchWithTimeout(url, 15000);
        if (!res.ok) {
          this.logger.error(`[${which}] file download failed: ${res.status}`);
          return null;
        }
        const buffer = Buffer.from(await res.arrayBuffer());
        const contentType =
          res.headers.get('content-type') ??
          guessContentType(file.file_path) ??
          'application/octet-stream';
        return { buffer, contentType };
      } catch (err) {
        this.logger.error(
          `[${which}] getFile error (urinish ${attempt}/${ATTEMPTS}): ${describeError(
            err,
          )}`,
        );
        if (attempt < ATTEMPTS) {
          await new Promise((r) => setTimeout(r, 800 * attempt));
          continue;
        }
        return null;
      }
    }
    return null;
  }

  /** AbortController bilan timeoutли fetch (osilib qolmaslik uchun). */
  private async fetchWithTimeout(url: string, ms: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    try {
      return await telegramFetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  async notifyEmployer(telegramId: string, text: string): Promise<void> {
    await this.send(this.employerApi, telegramId, text, 'employer');
  }

  async notifyWorker(telegramId: string, text: string): Promise<void> {
    await this.send(this.workerApi, telegramId, text, 'worker');
  }

  /** Foydalanuvchi roli bo'yicha mos botdan oddiy matnli xabar yuboradi. */
  async notify(which: BotWhich, telegramId: string, text: string): Promise<void> {
    if (which === 'employer') await this.notifyEmployer(telegramId, text);
    else await this.notifyWorker(telegramId, text);
  }

  /**
   * Foydalanuvchiga rasm yoki video yuboradi (admin paneldan yuborilgan ixtiyoriy
   * matn — caption bilan). Media bo'lmasa oddiy matn yuboriladi.
   */
  async sendMediaToUser(
    which: BotWhich,
    telegramId: string,
    media: { buffer: Buffer; kind: MediaKind; filename?: string } | null,
    caption?: string,
  ): Promise<boolean> {
    const api = which === 'employer' ? this.employerApi : this.workerApi;
    if (!api) {
      this.logger.warn(`[${which}] sendMedia skipped (token not configured)`);
      return false;
    }
    try {
      if (!media) {
        await api.sendMessage(telegramId, caption ?? '');
        return true;
      }
      const file = new InputFile(media.buffer, media.filename);
      if (media.kind === 'video') {
        await api.sendVideo(telegramId, file, { caption });
      } else {
        await api.sendPhoto(telegramId, file, { caption });
      }
      return true;
    } catch (err) {
      this.logger.error(`[${which}] sendMedia failed: ${String(err)}`);
      return false;
    }
  }

  async publishToChannel(
    text: string,
    replyMarkup?: unknown,
  ): Promise<number | null> {
    const channelId = process.env.CHANNEL_ID;
    if (!this.workerApi || !channelId) {
      this.logger.warn('Channel publish skipped (no worker API or channel id)');
      return null;
    }
    try {
      const msg = await this.workerApi.sendMessage(channelId, text, {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reply_markup: replyMarkup as any,
      });
      return msg.message_id;
    } catch (err) {
      this.logger.error(`Channel publish failed: ${String(err)}`);
      return null;
    }
  }

  /** Kanal e'lon matnini yangilaydi; yopiq e'londa inline tugma olib tashlanadi. */
  async editChannelMessage(
    messageId: number,
    text: string,
    replyMarkup?: unknown,
  ): Promise<void> {
    const channelId = process.env.CHANNEL_ID;
    if (!this.workerApi || !channelId) return;
    try {
      await this.workerApi.editMessageText(
        channelId,
        messageId,
        text,
        {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          reply_markup: (replyMarkup ?? { inline_keyboard: [] }) as any,
        },
      );
    } catch (err) {
      this.logger.warn(`Channel edit failed: ${String(err)}`);
    }
  }

  /** Asosiy e'lon xabariga reply qilib matn yuboradi (joy ochilganda). */
  async sendChannelTextReply(
    replyToMessageId: number,
    text: string,
  ): Promise<void> {
    const channelId = process.env.CHANNEL_ID;
    if (!this.workerApi || !channelId) return;
    try {
      await this.workerApi.sendMessage(channelId, text, {
        reply_to_message_id: replyToMessageId,
      });
    } catch (err) {
      this.logger.warn(`Channel text reply failed: ${String(err)}`);
    }
  }

  /** Asosiy e'lon xabariga reply qilib xaritada lokatsiya yuboradi. */
  async sendChannelVenueReply(
    replyToMessageId: number,
    lat: number,
    lng: number,
    title: string,
  ): Promise<number | null> {
    const channelId = process.env.CHANNEL_ID;
    if (!this.workerApi || !channelId) return null;
    try {
      const msg = await this.workerApi.sendVenue(
        channelId,
        lat,
        lng,
        title.slice(0, 64),
        title,
        { reply_to_message_id: replyToMessageId },
      );
      return msg.message_id;
    } catch (err) {
      this.logger.warn(`Channel venue reply failed: ${String(err)}`);
      return null;
    }
  }

  async deleteChannelMessage(messageId: number): Promise<void> {
    const channelId = process.env.CHANNEL_ID;
    if (!this.workerApi || !channelId) return;
    try {
      await this.workerApi.deleteMessage(channelId, messageId);
    } catch (err) {
      this.logger.warn(`Channel delete failed: ${String(err)}`);
    }
  }

  /** Kanal xabaridan inline tugmani (Ishga yozilish) olib tashlaydi — joy to'lganda. */
  async removeChannelKeyboard(messageId: number): Promise<void> {
    const channelId = process.env.CHANNEL_ID;
    if (!this.workerApi || !channelId) return;
    try {
      await this.workerApi.editMessageReplyMarkup(channelId, messageId, {
        reply_markup: { inline_keyboard: [] },
      });
    } catch (err) {
      this.logger.warn(`Channel keyboard remove failed: ${String(err)}`);
    }
  }

  private async send(
    api: Api | undefined,
    telegramId: string,
    text: string,
    which: string,
  ): Promise<void> {
    if (!api) {
      this.logger.warn(
        `[${which}] notify skipped (token not configured): ${text}`,
      );
      return;
    }
    try {
      await api.sendMessage(telegramId, text);
    } catch (err) {
      this.logger.error(`[${which}] notify failed: ${String(err)}`);
    }
  }
}
