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
): Promise<GmailMessage[]> => {
  // サブスク関連のメールを検索するクエリ
  const searchTerms = [
    'subject:(receipt OR invoice OR 領収書 OR 請求 OR subscription OR サブスクリプション OR 月額 OR 年額 OR renewal OR 更新)',
    'from:(netflix OR spotify OR amazon OR apple OR google OR youtube OR disney OR hulu OR adobe OR microsoft OR dropbox OR notion OR slack OR zoom OR github OR figma)',
  ];

  const query = encodeURIComponent(searchTerms.join(' '));

  const response = await fetch(
    `${GMAIL_API_BASE}/messages?q=${query}&maxResults=100`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch emails');
  }

  const data = await response.json();
  return data.messages || [];
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
