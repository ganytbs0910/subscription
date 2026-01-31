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
  maxResults?: number, // undefinedなら全件取得
  onProgress?: (fetched: number) => void,
): Promise<GmailMessage[]> => {
  try {
    // 課金メールを送る主要な送信者に絞って検索（効率重視）
    const query = encodeURIComponent(
      'from:no_reply@email.apple.com OR ' +           // Apple
      'from:googleplay-noreply@google.com OR ' +      // Google Play
      'from:auto-confirm@amazon.co.jp OR ' +          // Amazon Japan
      'from:digital-no-reply@amazon.co.jp'            // Amazon Digital
    );

    const allMessages: GmailMessage[] = [];
    let pageToken: string | undefined;

    if (__DEV__) {
      console.log('[Gmail] 検索クエリ:', decodeURIComponent(query).substring(0, 200) + '...');
    }

    // ページネーションで取得（maxResultsがundefinedなら全件）
    while (true) {
      // 上限が設定されていて、既に達している場合は終了
      if (maxResults !== undefined && allMessages.length >= maxResults) {
        break;
      }

      const url = pageToken
        ? `${GMAIL_API_BASE}/messages?q=${query}&maxResults=100&pageToken=${pageToken}`
        : `${GMAIL_API_BASE}/messages?q=${query}&maxResults=100`;

      if (__DEV__) {
        console.log('[Gmail] APIリクエスト中...');
      }
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.json() as any;
        if (__DEV__) {
          console.error('[Gmail] APIエラー:', error);
        }
        throw new Error(error.error?.message || 'Failed to fetch emails');
      }

      const data = await response.json() as any;
      const messages = data.messages || [];
      if (__DEV__) {
        console.log(`[Gmail] 取得: ${messages.length}件 (累計: ${allMessages.length + messages.length}件)`);
      }
      allMessages.push(...messages);

      // 進捗を通知
      if (onProgress) {
        onProgress(allMessages.length);
      }

      pageToken = data.nextPageToken;
      if (!pageToken || messages.length === 0) break;
    }

    return maxResults !== undefined ? allMessages.slice(0, maxResults) : allMessages;
  } catch (error: any) {
    if (__DEV__) {
      console.error('[Gmail] fetchSubscriptionEmails エラー:', error);
    }
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
    if (__DEV__) {
      console.error('[Gmail] fetchEmailDetail エラー:', error);
    }
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
    if (__DEV__) {
      console.error('[Gmail] fetchMultipleEmailDetails エラー:', error);
    }
    throw new Error(error.message || '複数メールの取得に失敗しました');
  }
};
