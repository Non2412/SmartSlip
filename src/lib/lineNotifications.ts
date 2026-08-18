import clientPromise from './mongodb';
import { ObjectId } from 'mongodb';

const line = require('@line/bot-sdk');

const lineClient = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

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

    await lineClient.pushMessage(lineUserId, {
      type: 'text',
      text: message,
    });

    console.log(
      `[LINE Notification] Sent to user ${userId}: "${message}"`
    );
  } catch (error) {
    console.error('[LINE Notification] Error:', error);
    throw error;
  }
}

export async function notifyUserByLineUserId(
  lineUserId: string,
  message: string
): Promise<void> {
  try {
    await lineClient.pushMessage(lineUserId, {
      type: 'text',
      text: message,
    });

    console.log(
      `[LINE Notification] Sent to LineUserId ${lineUserId}: "${message}"`
    );
  } catch (error) {
    console.error('[LINE Notification] Error:', error);
    throw error;
  }
}
