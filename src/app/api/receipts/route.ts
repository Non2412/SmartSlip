import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// GET: ดึงรายการใบเสร็จทั้งหมด
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const client = await clientPromise;
    const db = client.db('smartslip_api');

    let query = {};
    if (userId) {
      query = { userId };
    }

    const receipts = await db
      .collection('receipts')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Map _id to string for frontend
    const formattedReceipts = receipts.map(r => ({
      ...r,
      id: r._id.toString(),
      _id: undefined
    }));

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
    const body = await request.json();
    const { storeName, totalAmount, userId, extractedData } = body;

    if (!storeName || totalAmount === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('smartslip_api');

    const newReceipt = {
      storeName,
      totalAmount: parseFloat(totalAmount.toString()),
      userId: userId || 'user123',
      extractedData: extractedData || null,
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
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: ลบใบเสร็จ (ตัวอย่างสำหรับอนาคต)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

    const client = await clientPromise;
    const db = client.db('smartslip_api');

    await db.collection('receipts').deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
