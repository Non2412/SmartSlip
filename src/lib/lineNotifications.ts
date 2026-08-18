import clientPromise from './mongodb';
import { ObjectId } from 'mongodb';

export async function notifyUserByLine(
  userId: string,
  message: string
): Promise<void> {
  try {
    const client = await clientPromise;
    const db = client.db();

    let userObjId: ObjectId | null = null;
    if (ObjectId.isValid(userId)) {
      userObjId = new ObjectId(userId);
    }

    if (!userObjId) {
      console.warn(`[LINE Notification] Invalid userId format: ${userId}`);
      return;
    }

    const lineAccount = await db.collection('accounts').findOne({
      userId: userObjId,
      provider: 'line'
    });

    if (!lineAccount || !lineAccount.providerAccountId) {
      console.warn(
        `[LINE Notification] User ${userId} has no lineUserId connected`
      );
      return;
    }

    const lineUserId = lineAccount.providerAccountId;

    await notifyUserByLineUserId(lineUserId, message);
  } catch (error) {
    console.error('[LINE Notification] Error in notifyUserByLine:', error);
    throw error;
  }
}

export async function notifyUserByLineUserId(
  lineUserId: string,
  message: string
): Promise<void> {
  try {
    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      console.warn('[LINE Notification] LINE_CHANNEL_ACCESS_TOKEN is not defined');
      return;
    }

    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: 'text', text: message }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LINE API responded with status ${response.status}: ${errorText}`);
    }

    console.log(
      `[LINE Notification] Sent to LineUserId ${lineUserId}: "${message}"`
    );
  } catch (error) {
    console.error('[LINE Notification] Error in notifyUserByLineUserId:', error);
    throw error;
  }
}
