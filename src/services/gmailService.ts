const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

export interface GmailMessage {
  id: string;
  threadId: string;
}

export interface GmailMessageDetail {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{
      mimeType: string;
      body?: { data?: string };
    }>;
  };
  internalDate: string;
}

export const fetchSubscriptionEmails = async (
  accessToken: string,
  maxResults?: number,
  onProgress?: (fetched: number) => void,
): Promise<GmailMessage[]> => {
  try {
    const query = encodeURIComponent(
      'from:no_reply@email.apple.com OR ' +
      'from:googleplay-noreply@google.com OR ' +
      'from:auto-confirm@amazon.co.jp OR ' +
      'from:digital-no-reply@amazon.co.jp'
    );

    const allMessages: GmailMessage[] = [];
    let pageToken: string | undefined;

    while (true) {
      if (maxResults !== undefined && allMessages.length >= maxResults) {
        break;
      }

      const url = pageToken
        ? `${GMAIL_API_BASE}/messages?q=${query}&maxResults=100&pageToken=${pageToken}`
        : `${GMAIL_API_BASE}/messages?q=${query}&maxResults=100`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json() as any;
        throw new Error(error.error?.message || 'Failed to fetch emails');
      }

      const data = await response.json() as any;
      const messages = data.messages || [];
      allMessages.push(...messages);

      if (onProgress) {
        onProgress(allMessages.length);
      }

      pageToken = data.nextPageToken;
      if (!pageToken || messages.length === 0) break;
    }

    return maxResults !== undefined ? allMessages.slice(0, maxResults) : allMessages;
  } catch (error: any) {
    throw new Error(error.message || 'メールの取得に失敗しました');
  }
};

export const fetchEmailDetail = async (
  accessToken: string,
  messageId: string,
): Promise<GmailMessageDetail> => {
  try {
    const response = await fetch(`${GMAIL_API_BASE}/messages/${messageId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(error.error?.message || 'Failed to fetch email detail');
    }

    return await response.json() as GmailMessageDetail;
  } catch (error: any) {
    throw new Error(error.message || 'メール詳細の取得に失敗しました');
  }
};

export const fetchMultipleEmailDetails = async (
  accessToken: string,
  messageIds: string[],
  onProgress?: (current: number, total: number) => void,
): Promise<GmailMessageDetail[]> => {
  try {
    const results: GmailMessageDetail[] = [];
    const batchSize = 10;

    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(id => fetchEmailDetail(accessToken, id)),
      );
      results.push(...batchResults);

      if (onProgress) {
        onProgress(Math.min(i + batchSize, messageIds.length), messageIds.length);
      }
    }

    return results;
  } catch (error: any) {
    throw new Error(error.message || '複数メールの取得に失敗しました');
  }
};
