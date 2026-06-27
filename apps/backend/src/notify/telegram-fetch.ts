import nodeFetch, { RequestInit as NodeFetchInit } from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import type { Agent } from 'node:http';

let cachedAgent: Agent | undefined;
let cachedProxyUrl: string | undefined;

/** TELEGRAM_PROXY yoki standart HTTPS_PROXY / HTTP_PROXY. */
export function telegramProxyUrl(): string | undefined {
  const url =
    process.env.TELEGRAM_PROXY?.trim() ||
    process.env.HTTPS_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim();
  return url || undefined;
}

function agentFor(proxyUrl: string): Agent {
  if (proxyUrl.startsWith('socks://') || proxyUrl.startsWith('socks5://')) {
    return new SocksProxyAgent(proxyUrl) as unknown as Agent;
  }
  return new HttpsProxyAgent(proxyUrl) as unknown as Agent;
}

function proxyAgent(): Agent | undefined {
  const proxyUrl = telegramProxyUrl();
  if (!proxyUrl) return undefined;
  if (!cachedAgent || cachedProxyUrl !== proxyUrl) {
    cachedAgent = agentFor(proxyUrl);
    cachedProxyUrl = proxyUrl;
  }
  return cachedAgent;
}

/**
 * grammY (node-fetch v2) va fayl yuklash uchun proxy qo'llab-quvvatlaydigan fetch.
 * Node ning o'z `fetch` i proxy ni bilmasligi sababli alohida ishlatiladi.
 */
export const telegramFetch: typeof fetch = ((
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1],
) => {
  const agent = proxyAgent();
  const opts: NodeFetchInit = { ...(init as NodeFetchInit) };
  if (agent) opts.agent = agent;
  return nodeFetch(
    input as Parameters<typeof nodeFetch>[0],
    opts,
  ) as unknown as ReturnType<typeof fetch>;
}) as typeof fetch;

/** Xato xabarlaridan bot tokenini olib tashlaydi. */
export function sanitizeTelegramError(text: string): string {
  return text
    .replace(/https:\/\/api\.telegram\.org\/bot[^/\s]+/g, 'https://api.telegram.org/bot[REDACTED]')
    .replace(/\bbot\d+:[A-Za-z0-9_-]+/g, 'bot[REDACTED]');
}
