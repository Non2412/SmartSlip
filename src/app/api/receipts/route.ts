import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { auth } from '@/auth';
import { getEffectiveRoleContext, buildRoleContextFilter } from '@/lib/roleContext';

// GET: ดึงรายการใบเสร็จทั้งหมด
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).status !== 'active' && (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const lineUserId = searchParams.get('lineUserId');

    const client = await clientPromise;
    const db = client.db('smartslip_api');

    const userRole = (session.user as any).role;
    const currentUserId = session.user.id;
    const currentLineUserId = (session as any).lineUserId;

    let query: Record<string, any> = {};
    if (userRole === 'admin') {
      const all = searchParams.get('all') === 'true';
      if (!all) {
        const targetUserId = userId || currentUserId;
        const targetLineUserId = lineUserId || currentLineUserId;
        if (targetUserId && targetLineUserId) {
          query = { $or: [{ userId: targetUserId }, { userId: targetLineUserId }] };
        } else if (targetUserId) {
          query = { userId: targetUserId };
        }
        // Admin viewing their own receipts (not someone else's, via admin management): respect chosen role-context preview
        if (targetUserId === currentUserId) {
          const roleContext = await getEffectiveRoleContext(session);
          query = { $and: [query, buildRoleContextFilter(roleContext)] };
        }
      }
      // If all === true, query is empty, fetching all receipts
    } else {
      if (currentUserId && currentLineUserId) {
        query = { $or: [{ userId: currentUserId }, { userId: currentLineUserId }] };
      } else if (currentUserId) {
        query = { userId: currentUserId };
      }
      // Separate data per role: clerk sees only clerk receipts; user sees user + legacy (no roleContext)
      query = { $and: [query, buildRoleContextFilter(userRole === 'clerk' ? 'clerk' : 'user')] };
    }

    const receipts = await db
      .collection('receipts')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Map _id to string and normalize field names between frontend/backend receipt formats
    const formattedReceipts = receipts.map(r => {
      const doc: any = { ...r, id: r._id.toString(), _id: undefined };

      // Backend webhook saves 'amount' not 'totalAmount'
      if (doc.amount !== undefined && doc.totalAmount === undefined) {
        doc.totalAmount = doc.amount;
      }
      // Backend webhook saves 'imageURL' (uppercase) not 'imageUrl'
      if (doc.imageURL && !doc.imageUrl) {
        doc.imageUrl = doc.imageURL;
      }
      // Mark backend LINE webhook receipts as source='line'
      if (!doc.source && (doc.transactionId?.startsWith('LINE-') || (lineUserId && doc.userId === lineUserId))) {
        doc.source = 'line';
      }
      // Normalize extractedData from backend flat fields
      if (!doc.extractedData) {
        doc.isPending = true;
        if (doc.extractedSender || doc.extractedReceiver || doc.customerName) {
          doc.extractedData = {
            date: doc.issueDate ? new Date(doc.issueDate).toISOString() : undefined,
            receiver: doc.extractedReceiver || doc.storeName,
            method: doc.extractedSender || doc.customerName,
            items: doc.items || [],
          };
        }
      } else {
        doc.isPending = false;
      }

      return doc;
    });

    return NextResponse.json({
      success: true,
      data: formattedReceipts
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST: เพิ่มใบเสร็จใหม่
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).status !== 'active' && (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { storeName, totalAmount, userId, extractedData, imageFileId, imageHash } = body;

    if (!storeName || totalAmount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const userRole = (session.user as any).role;
    const currentUserId = session.user.id;

    // Regular user can only create receipts for themselves
    let targetUserId = userId || currentUserId;
    if (userRole !== 'admin') {
      targetUserId = currentUserId;
    }

    const client = await clientPromise;
    const db = client.db('smartslip_api');

    const roleContext = await getEffectiveRoleContext(session);

    const newReceipt = {
      storeName,
      totalAmount: parseFloat(totalAmount.toString()),
      userId: targetUserId,
      roleContext,
      extractedData: extractedData || null,
      imageFileId: imageFileId || null,
      imageHash: imageHash || null,
      transactionId: `web-${new ObjectId().toHexString()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await db.collection('receipts').insertOne(newReceipt);

    return NextResponse.json({
      success: true,
      data: {
        id: result.insertedId.toString(),
        ...newReceipt
      }
    });
  } catch (error: any) {
    console.error('[POST /api/receipts]', error.message, error.stack);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH: อัปเดตข้อมูลใบเสร็จ
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).status !== 'active' && (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db('smartslip_api');

    // Find existing receipt
    const existing = await db.collection('receipts').findOne({ _id: new ObjectId(id) });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Receipt not found' }, { status: 404 });
    }

    // Verify ownership
    const userRole = (session.user as any).role;
    const currentUserId = session.user.id;
    const currentLineUserId = (session as any).lineUserId;

    if (userRole !== 'admin' && existing.userId !== currentUserId && existing.userId !== currentLineUserId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { storeName, totalAmount, extractedData, imageUrl, imageURL, imageHash } = body;

    const updateFields: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (storeName !== undefined) updateFields.storeName = storeName;
    if (totalAmount !== undefined) updateFields.totalAmount = parseFloat(totalAmount.toString());
    if (extractedData !== undefined) updateFields.extractedData = extractedData;
    if (imageUrl !== undefined) updateFields.imageUrl = imageUrl;
    if (imageURL !== undefined) updateFields.imageURL = imageURL;
    if (imageHash !== undefined) updateFields.imageHash = imageHash;

    const result = await db.collection('receipts').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json({ success: false, error: 'Receipt not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { ...result, id: result._id.toString(), _id: undefined }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: ลบใบเสร็จ (รองรับทีละใบ หรือ หลายใบผ่าน ?ids=)
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).status !== 'active' && (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    if (!id && !idsParam) return NextResponse.json({ success: false, error: 'ID or IDs required' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db('smartslip_api');

    const userRole = (session.user as any).role;
    const currentUserId = session.user.id;
    const currentLineUserId = (session as any).lineUserId;

    // Verify ownership of all targets
    const targetIds: ObjectId[] = [];
    if (idsParam) {
      idsParam.split(',').forEach(item => {
        if (ObjectId.isValid(item.trim())) {
          targetIds.push(new ObjectId(item.trim()));
        }
      });
    } else if (id && ObjectId.isValid(id)) {
      targetIds.push(new ObjectId(id));
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid ID format' }, { status: 400 });
    }

    if (userRole !== 'admin') {
      const items = await db.collection('receipts').find({ _id: { $in: targetIds } }).toArray();
      const hasUnowned = items.some(item => item.userId !== currentUserId && item.userId !== currentLineUserId);
      if (hasUnowned) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
      }
    }

    // Perform delete
    await db.collection('receipts').deleteMany({ _id: { $in: targetIds } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
