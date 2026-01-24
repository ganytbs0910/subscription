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
  // サブスク関連のメールを検索するクエリ（送信者制限なし）
  // 請求書・領収書関連のキーワードで幅広く検索
  const query = encodeURIComponent(
    'subject:(receipt OR invoice OR payment OR billing OR subscription OR 領収書 OR 領収 OR 請求書 OR 請求 OR お支払い OR 支払い OR サブスクリプション OR 月額 OR 年額 OR 更新 OR renewal OR renewed OR charge OR charged)'
  );

  const allMessages: GmailMessage[] = [];
  let pageToken: string | undefined;

  // ページネーションで取得（maxResultsがundefinedなら全件）
  while (true) {
    // 上限が設定されていて、既に達している場合は終了
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
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to fetch emails');
    }

    const data = await response.json();
    const messages = data.messages || [];
    allMessages.push(...messages);

    // 進捗を通知
    if (onProgress) {
      onProgress(allMessages.length);
    }

    pageToken = data.nextPageToken;
    if (!pageToken || messages.length === 0) break;
  }

  return maxResults !== undefined ? allMessages.slice(0, maxResults) : allMessages;
};

export const fetchEmailDetail = async (
  accessToken: string,
  messageId: string,
): Promise<GmailMessageDetail> => {
  const response = await fetch(`${GMAIL_API_BASE}/messages/${messageId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch email detail');
  }

  return response.json();
};

export const fetchMultipleEmailDetails = async (
  accessToken: string,
  messageIds: string[],
  onProgress?: (current: number, total: number) => void,
): Promise<GmailMessageDetail[]> => {
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
};
