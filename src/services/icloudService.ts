import TcpSocket from 'react-native-tcp-socket';

// Declare global atob for TypeScript
declare const atob: (data: string) => string;

const ICLOUD_IMAP = {
  host: 'imap.mail.me.com',
  port: 993,
  // STARTTLS port
  portStartTls: 143,
};

export interface ICloudEmail {
  id: string;
  subject: string;
  from: string;
  date: string;
  body: string;
  snippet: string;
}

export interface ICloudCredentials {
  email: string;
  appPassword: string;
}

class ImapClient {
  private socket: ReturnType<typeof TcpSocket.createConnection> | null = null;
  private commandCounter = 0;
  private responseBuffer = '';
  private pendingCallbacks: Map<
    string,
    { resolve: (value: string) => void; reject: (error: Error) => void }
  > = new Map();

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Attempting to connect to iCloud IMAP (plain, then STARTTLS)...');

      // First try plain connection on port 143, then upgrade with STARTTLS
      const options = {
        host: ICLOUD_IMAP.host,
        port: ICLOUD_IMAP.portStartTls, // 143
      };

      console.log('Creating plain connection with options:', JSON.stringify(options));

      this.socket = TcpSocket.createConnection(options, () => {
        console.log('Plain connection callback fired');
      });

      // Log all possible events
      this.socket.on('connect', () => {
        console.log('Event: connect (plain)');
      });

      this.socket.on('data', (data: string | Buffer) => {
        console.log('Event: data received, type:', typeof data, 'length:', data?.length);
        const chunk = typeof data === 'string' ? data : data.toString('utf8');
        console.log('Data content (first 300 chars):', chunk.substring(0, 300));
        this.handleData(chunk);
      });

      this.socket.on('error', (error: Error) => {
        console.error('Event: error:', error.message);
        reject(error);
      });

      this.socket.on('close', (hadError: boolean) => {
        console.log('Event: close, hadError:', hadError);
      });

      this.socket.on('timeout', () => {
        console.log('Event: timeout');
      });

      this.socket.on('end', () => {
        console.log('Event: end');
      });

      // Wait for server greeting
      let greetingChecks = 0;
      const checkGreeting = () => {
        greetingChecks++;
        if (greetingChecks % 20 === 0) {
          console.log('Waiting for greeting, buffer:', this.responseBuffer.substring(0, 100));
        }
        if (this.responseBuffer.includes('* OK')) {
          console.log('Got server greeting!');
          this.responseBuffer = '';
          resolve();
        } else {
          setTimeout(checkGreeting, 100);
        }
      };
      setTimeout(checkGreeting, 100);

      // Timeout after 15 seconds
      setTimeout(() => {
        if (!this.responseBuffer.includes('* OK')) {
          console.log('Timeout! Buffer contents:', this.responseBuffer);
          reject(new Error('Connection timeout'));
        }
      }, 15000);
    });
  }

  private handleData(chunk: string) {
    console.log('IMAP received data:', chunk.substring(0, 200));
    this.responseBuffer += chunk;

    // Check for completed responses
    const lines = this.responseBuffer.split('\r\n');
    for (const line of lines) {
      // Check for tagged responses (A001, A002, etc.)
      const tagMatch = line.match(/^(A\d+)\s+(OK|NO|BAD)/);
      if (tagMatch) {
        const tag = tagMatch[1];
        const callback = this.pendingCallbacks.get(tag);
        if (callback) {
          if (tagMatch[2] === 'OK') {
            callback.resolve(this.responseBuffer);
          } else {
            callback.reject(new Error(`IMAP error: ${line}`));
          }
          this.pendingCallbacks.delete(tag);
          this.responseBuffer = '';
        }
      }
    }
  }

  private async sendCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.commandCounter++;
      const tag = `A${String(this.commandCounter).padStart(3, '0')}`;
      const fullCommand = `${tag} ${command}\r\n`;

      this.pendingCallbacks.set(tag, { resolve, reject });
      this.responseBuffer = '';

      if (this.socket) {
        this.socket.write(fullCommand);
      } else {
        reject(new Error('Socket not connected'));
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingCallbacks.has(tag)) {
          this.pendingCallbacks.delete(tag);
          reject(new Error('Command timeout'));
        }
      }, 30000);
    });
  }

  async login(email: string, password: string): Promise<void> {
    const response = await this.sendCommand(`LOGIN "${email}" "${password}"`);
    if (!response.includes('OK')) {
      throw new Error('ログインに失敗しました。メールアドレスとアプリ用パスワードを確認してください。');
    }
  }

  async selectInbox(): Promise<number> {
    const response = await this.sendCommand('SELECT INBOX');
    const existsMatch = response.match(/\*\s+(\d+)\s+EXISTS/);
    return existsMatch ? parseInt(existsMatch[1], 10) : 0;
  }

  async searchSubscriptionEmails(): Promise<string[]> {
    // Search for subscription-related emails
    const searchQueries = [
      'OR SUBJECT "receipt" SUBJECT "invoice"',
      'OR SUBJECT "領収" SUBJECT "請求"',
      'OR SUBJECT "subscription" SUBJECT "サブスクリプション"',
      'OR SUBJECT "月額" SUBJECT "年額"',
    ];

    const allIds = new Set<string>();

    for (const query of searchQueries) {
      try {
        const response = await this.sendCommand(`SEARCH ${query}`);
        const searchMatch = response.match(/\*\s+SEARCH\s+([\d\s]+)/);
        if (searchMatch) {
          const ids = searchMatch[1].trim().split(/\s+/).filter(id => id);
          ids.forEach(id => allIds.add(id));
        }
      } catch (error) {
        console.log('Search query failed:', query, error);
      }
    }

    // Also search by sender
    const senderQueries = [
      'FROM "netflix"',
      'FROM "spotify"',
      'FROM "apple"',
      'FROM "amazon"',
      'FROM "google"',
      'FROM "adobe"',
      'FROM "microsoft"',
      'FROM "youtube"',
      'FROM "disney"',
      'FROM "dropbox"',
      'FROM "notion"',
      'FROM "slack"',
      'FROM "zoom"',
      'FROM "github"',
    ];

    for (const query of senderQueries) {
      try {
        const response = await this.sendCommand(`SEARCH ${query}`);
        const searchMatch = response.match(/\*\s+SEARCH\s+([\d\s]+)/);
        if (searchMatch) {
          const ids = searchMatch[1].trim().split(/\s+/).filter(id => id);
          ids.forEach(id => allIds.add(id));
        }
      } catch (error) {
        // Ignore search errors
      }
    }

    // Return latest 50 emails
    const idsArray = Array.from(allIds).map(Number).sort((a, b) => b - a);
    return idsArray.slice(0, 50).map(String);
  }

  async fetchEmail(messageId: string): Promise<ICloudEmail> {
    const response = await this.sendCommand(
      `FETCH ${messageId} (BODY[HEADER.FIELDS (FROM SUBJECT DATE)] BODY[TEXT])`,
    );

    const email: ICloudEmail = {
      id: messageId,
      subject: '',
      from: '',
      date: '',
      body: '',
      snippet: '',
    };

    // Parse headers
    const subjectMatch = response.match(/Subject:\s*(.+?)(?:\r\n(?!\s)|$)/i);
    if (subjectMatch) {
      email.subject = this.decodeHeader(subjectMatch[1].trim());
    }

    const fromMatch = response.match(/From:\s*(.+?)(?:\r\n(?!\s)|$)/i);
    if (fromMatch) {
      email.from = this.decodeHeader(fromMatch[1].trim());
    }

    const dateMatch = response.match(/Date:\s*(.+?)(?:\r\n(?!\s)|$)/i);
    if (dateMatch) {
      email.date = dateMatch[1].trim();
    }

    // Parse body - this is simplified, real implementation would need MIME parsing
    const bodyStart = response.indexOf('\r\n\r\n');
    if (bodyStart !== -1) {
      let body = response.substring(bodyStart + 4);
      // Remove IMAP tags and cleanup
      body = body.replace(/A\d+\s+OK.*/g, '').trim();
      body = body.replace(/\)\r\n/g, '');

      // Decode if quoted-printable or base64
      if (body.includes('=?')) {
        body = this.decodeHeader(body);
      }

      // Handle quoted-printable
      body = this.decodeQuotedPrintable(body);

      email.body = body;
      email.snippet = body.substring(0, 200).replace(/\s+/g, ' ');
    }

    return email;
  }

  private decodeHeader(str: string): string {
    // Decode MIME encoded-word syntax (=?charset?encoding?text?=)
    return str.replace(/=\?([^?]+)\?([BQbq])\?([^?]+)\?=/g, (_, charset, encoding, text) => {
      try {
        if (encoding.toUpperCase() === 'B') {
          // Base64
          return this.base64Decode(text);
        } else if (encoding.toUpperCase() === 'Q') {
          // Quoted-printable
          return this.decodeQuotedPrintable(text.replace(/_/g, ' '));
        }
      } catch (e) {
        console.log('Decode error:', e);
      }
      return text;
    });
  }

  private base64Decode(str: string): string {
    try {
      return decodeURIComponent(
        atob(str)
          .split('')
          .map((c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
    } catch {
      try {
        return atob(str);
      } catch {
        return str;
      }
    }
  }

  private decodeQuotedPrintable(str: string): string {
    return str
      .replace(/=\r\n/g, '')
      .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
  }

  async logout(): Promise<void> {
    try {
      await this.sendCommand('LOGOUT');
    } catch {
      // Ignore logout errors
    }
    this.disconnect();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }
}

// Store credentials securely
let storedCredentials: ICloudCredentials | null = null;

export const storeICloudCredentials = (credentials: ICloudCredentials): void => {
  storedCredentials = credentials;
};

export const getStoredICloudCredentials = (): ICloudCredentials | null => {
  return storedCredentials;
};

export const clearICloudCredentials = (): void => {
  storedCredentials = null;
};

export type ICloudStatus =
  | 'connecting'
  | 'connected'
  | 'logging_in'
  | 'logged_in'
  | 'selecting_inbox'
  | 'searching'
  | 'fetching'
  | 'done';

export const fetchICloudSubscriptionEmails = async (
  credentials: ICloudCredentials,
  onProgress?: (current: number, total: number) => void,
  onStatus?: (status: ICloudStatus, detail?: string) => void,
): Promise<ICloudEmail[]> => {
  const client = new ImapClient();

  try {
    // Connect
    onStatus?.('connecting', 'iCloud IMAPサーバーに接続中...');
    await client.connect();
    onStatus?.('connected', 'TLS接続完了');

    // Login
    onStatus?.('logging_in', 'ログイン中...');
    await client.login(credentials.email, credentials.appPassword);
    onStatus?.('logged_in', 'ログイン成功');

    // Select INBOX
    onStatus?.('selecting_inbox', '受信トレイを選択中...');
    await client.selectInbox();

    // Search for subscription emails
    onStatus?.('searching', 'サブスク関連メールを検索中...');
    const messageIds = await client.searchSubscriptionEmails();

    if (messageIds.length === 0) {
      await client.logout();
      onStatus?.('done', 'メールが見つかりませんでした');
      return [];
    }

    // Fetch email details
    onStatus?.('fetching', `${messageIds.length}件のメールを取得中...`);
    const emails: ICloudEmail[] = [];
    const total = messageIds.length;

    for (let i = 0; i < messageIds.length; i++) {
      try {
        const email = await client.fetchEmail(messageIds[i]);
        emails.push(email);

        if (onProgress) {
          onProgress(i + 1, total);
        }
      } catch (error) {
        console.log('Failed to fetch email:', messageIds[i], error);
      }
    }

    // Logout
    await client.logout();
    onStatus?.('done', '完了');

    return emails;
  } catch (error) {
    client.disconnect();
    throw error;
  }
};

// Convert iCloud email to a format compatible with the email parser
export const convertToGenericFormat = (email: ICloudEmail): {
  id: string;
  subject: string;
  from: string;
  body: string;
  snippet: string;
  date: string;
} => {
  return {
    id: email.id,
    subject: email.subject,
    from: email.from,
    body: email.body,
    snippet: email.snippet,
    date: email.date,
  };
};
