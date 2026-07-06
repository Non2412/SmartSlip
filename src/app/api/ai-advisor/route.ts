import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { GoogleGenAI } from '@google/genai';
import { identifyDuplicateReceipts } from '@/lib/ocr-utils';

export async function POST(request: Request) {
  try {
    const { userId, lineUserId, messages } = await request.json();

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Missing userId parameter' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'GEMINI_API_KEY is not configured on the server' }, { status: 500 });
    }

    // 1. Connect to MongoDB and fetch user receipts
    const client = await clientPromise;
    const db = client.db('smartslip_api');

    let query: Record<string, any> = {};
    if (userId && lineUserId) {
      query = { $or: [{ userId }, { userId: lineUserId }] };
    } else {
      query = { userId };
    }

    const rawReceipts = await db
      .collection('receipts')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    // Normalize and filter out duplicates
    const normalizedReceipts = rawReceipts.map(r => {
      const doc: any = { ...r, id: r._id.toString(), _id: undefined };
      if (doc.amount !== undefined && doc.totalAmount === undefined) {
        doc.totalAmount = doc.amount;
      }
      return doc;
    });

    const { duplicateIds } = identifyDuplicateReceipts(normalizedReceipts);
    const uniqueReceipts = normalizedReceipts.filter(r => !duplicateIds.has(r.id));

    if (uniqueReceipts.length === 0 && (!messages || messages.length === 0)) {
      return NextResponse.json({
        success: true,
        data: 'ไม่มีข้อมูลรายจ่ายล่าสุดในระบบอัปโหลดใบเสร็จของคุณในขณะนี้ กรุณาอัปโหลดใบเสร็จเพื่อเริ่มต้นวิเคราะห์สุขภาพทางการเงิน!'
      });
    }

    // 2. Aggregate statistics to feed into the prompt
    let totalSpending = 0;
    const categoryTotals: Record<string, number> = {};
    const recentTransactions: any[] = [];

    uniqueReceipts.forEach((r, idx) => {
      const amount = parseFloat(r.amount !== undefined ? r.amount : r.totalAmount || 0);
      totalSpending += amount;

      const cat = r.extractedData?.category || 'อื่นๆ';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amount;

      if (idx < 25) { // Limit to 25 recent transactions for context size
        let txDate = '';
        if (r.extractedData?.date) {
          txDate = String(r.extractedData.date).split('T')[0];
        } else if (r.createdAt) {
          try {
            const d = new Date(r.createdAt);
            if (!isNaN(d.getTime())) {
              txDate = d.toISOString().split('T')[0];
            }
          } catch {}
        }
        recentTransactions.push({
          store: r.storeName,
          amount,
          date: txDate || new Date().toISOString().split('T')[0],
          category: cat,
        });
      }
    });

    // Determine if it's a chatbot request or a one-off report request
    const isChatMode = messages && Array.isArray(messages) && messages.length > 0;

    let systemInstructionText = '';
    let apiContents: any[] = [];

    if (isChatMode) {
      systemInstructionText = `คุณคือ "SmartSlip AI Advisor" ที่ปรึกษาการเงินอัจฉริยะแบบแชทบอท ผู้ใช้สามารถคุย ปรึกษา ถามคำถามเกี่ยวกับการเงิน วางแผนการเงินส่วนบุคคล และประเมินรายจ่ายได้โดยตรง
หน้าที่ของคุณคือสนทนากับผู้ใช้อย่างเป็นกันเอง มีประโยชน์ สุภาพ และให้กำลังใจ

นี่คือข้อมูลสรุปทางการเงินจริงของผู้ใช้ที่ดึงมาจากใบเสร็จทั้งหมดในระบบเพื่อใช้เป็นบริบทประกอบการตอบคำถาม:
- ยอดใช้จ่ายรวมสะสม: ${totalSpending.toFixed(2)} บาท
- จำนวนใบเสร็จทั้งหมด: ${uniqueReceipts.length} ใบ
- สรุปแยกตามหมวดหมู่:
${Object.keys(categoryTotals).map(cat => `  * หมวด ${cat}: ${categoryTotals[cat].toFixed(2)} บาท (${totalSpending > 0 ? ((categoryTotals[cat]/totalSpending)*100).toFixed(1) : 0}%)`).join('\n')}

- รายการใช้จ่ายล่าสุด 25 รายการ:
${recentTransactions.map(tx => `  * [${tx.date}] ${tx.store} - ${tx.amount} บาท (หมวด ${tx.category})`).join('\n')}

เวลาตอบคำถาม:
1. หากผู้ใช้ถามเรื่องรายจ่ายส่วนตัว ให้ใช้ข้อมูลสรุปด้านบนในการวิเคราะห์ตอบคำถามอย่างเจาะลึก
2. ให้คำแนะนำที่จับต้องได้จริง (Actionable tips)
3. เขียนคำตอบในรูปแบบ Markdown ภาษาไทย จัดหัวข้อและใช้ Emoji ให้อ่านง่าย สบายตา`;

      apiContents = messages.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
    } else {
      // One-off analysis prompt
      const aiData = {
        totalSpending: totalSpending.toFixed(2),
        transactionCount: uniqueReceipts.length,
        categoryBreakdown: Object.keys(categoryTotals).map(cat => ({
          category: cat,
          total: categoryTotals[cat].toFixed(2),
          percentage: totalSpending > 0 ? ((categoryTotals[cat] / totalSpending) * 100).toFixed(1) + '%' : '0%'
        })),
        recentTransactions
      };

      systemInstructionText = `คุณคือ "ที่ปรึกษาการเงินอัจฉริยะ (SmartSlip AI Advisor)" ที่มีความเชี่ยวชาญด้านการวางแผนการเงินส่วนบุคคลและพฤติกรรมการออมเงิน
หน้าที่ของคุณคือช่วยผู้ใช้วิเคราะห์ประวัติรายจ่ายที่ได้จากการสแกนสลิป/ใบเสร็จ และให้คำแนะนำเพื่อเพิ่มโอกาสในการเก็บออมและมีพฤติกรรมทางการเงินที่ดีขึ้น

ข้อมูลรายจ่ายล่าสุดของผู้ใช้:
${JSON.stringify(aiData, null, 2)}

โปรดสร้างรายงานผลวิเคราะห์ทางการเงินและคำแนะนำในรูปแบบ Markdown ภาษาไทย ที่สุภาพ เป็นกันเอง และให้กำลังใจผู้ใช้ โดยจัดเรียงหัวข้อตามโครงสร้างดังนี้:

## 📊 สรุปสุขภาพการเงินของคุณ
(ประเมินภาพรวมความสมดุลของการใช้จ่าย หมวดหมู่หลักที่เสียเงินไปมากที่สุด และสถานะการใช้เงินเป็นเปอร์เซ็นต์อย่างเข้าใจง่าย)

## ⚠️ จุดที่ควรระวังเป็นพิเศษ
(ค้นหาพฤติกรรมที่เสี่ยง เช่น การจ่ายในร้านเดิมบ่อยเกินไป, การทำรายการก้อนใหญ่, หรือสัดส่วนค่าใช้จ่ายที่ไม่จำเป็น เช่น ช้อปปิ้ง ท่องเที่ยว ที่มากเกินไป)

## 💡 5 เคล็ดลับออมเงินแบบเจาะลึกเฉพาะคุณ
(เขียนคำแนะนำที่ทำได้จริง 3-5 ข้อที่เหมาะกับข้อมูลรายจ่ายข้างต้น เพื่อชี้พิกัดประหยัดเงินได้ชัดเจน เช่น แนะนำทางเลือกลดหย่อน ยอดการทำอาหารที่บ้าน ฯลฯ)

## 🏆 ชาเลนจ์ท้าทายตนเองในเดือนนี้
(เสนอภารกิจออมเงินสนุกๆ 1-2 ชาเลนจ์ เช่น 'No-Shopping Challenge' หรือ 'Coffee Budget Cut' เพื่อกระตุ้นให้ผู้ใช้อยากควบคุมรายจ่ายในเดือนถัดไป)`;

      apiContents = [{ role: 'user', parts: [{ text: 'กรุณาวิเคราะห์การเงินของฉัน' }] }];
    }

    // 4. Call Gemini API
    const ai = new GoogleGenAI({ apiKey });
    
    // Try multiple models just like in gemini-ocr.ts to prevent model downtime failures
    const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-3.5-flash'];
    let aiResponse = null;
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        console.log(`AI Advisor: Requesting content generation from model: ${model} (ChatMode: ${isChatMode})`);
        const response = await ai.models.generateContent({
          model,
          contents: apiContents,
          config: {
            systemInstruction: systemInstructionText
          }
        });
        aiResponse = response.text;
        break;
      } catch (err: any) {
        console.warn(`AI Advisor model ${model} failed, trying next...`, err.message);
        lastError = err;
      }
    }

    if (!aiResponse) {
      throw lastError || new Error('All Gemini models failed to generate advisor response');
    }

    return NextResponse.json({
      success: true,
      data: aiResponse
    });

  } catch (error: any) {
    console.error('AI Financial Advisor Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to analyze financial data' },
      { status: 500 }
    );
  }
}
