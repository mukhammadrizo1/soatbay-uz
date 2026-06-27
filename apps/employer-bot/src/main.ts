import 'dotenv/config';
import { createBot } from './bot';

async function main() {
  const token = process.env.EMPLOYER_BOT_TOKEN;
  if (!token || token.startsWith('000000000')) {
    // eslint-disable-next-line no-console
    console.error(
      '❌ EMPLOYER_BOT_TOKEN is not configured. Set it in your .env file.',
    );
    process.exit(1);
  }
  const bot = createBot(token);
  // eslint-disable-next-line no-console
  console.log('🤖 Employer bot starting (long polling)...');
  await bot.start();
}

main();
