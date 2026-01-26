import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ImapFlow } from 'imapflow';
import { z } from 'zod';

const requestSchema = z.object({
  email: z.string().email(),
  appPassword: z.string().min(1),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parseResult = requestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request body',
      details: parseResult.error.issues,
    });
  }

  const { email, appPassword } = parseResult.data;

  const client = new ImapFlow({
    host: 'imap.mail.me.com',
    port: 993,
    secure: true,
    auth: {
      user: email,
      pass: appPassword,
    },
    logger: false,
  });

  try {
    await client.connect();
    await client.logout();

    return res.status(200).json({
      success: true,
      message: 'Connection successful',
    });
  } catch (error: any) {
    console.error('iCloud connection error:', error);

    let errorMessage = 'Connection failed';
    if (error.authenticationFailed) {
      errorMessage = 'Authentication failed. Please check your email and app-specific password.';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Could not connect to iCloud mail server.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Connection timed out.';
    }

    return res.status(401).json({
      success: false,
      error: errorMessage,
    });
  }
}
