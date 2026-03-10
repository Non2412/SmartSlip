import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { image } = await req.json();

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 });
        }

        // Try calling the local PaddleOCR service
        try {
            const pythonResponse = await fetch('http://localhost:5000/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image })
            });

            if (pythonResponse.ok) {
                const data = await pythonResponse.json();
                return NextResponse.json({ ...data, source: 'paddleocr' });
            }
        } catch (e) {
            console.log("OCR service not found, falling back to mock data.");
        }

        // --- FALLBACK MOCK DATA ---
        await new Promise(resolve => setTimeout(resolve, 1500));

        return NextResponse.json({
            success: true,
            source: 'mock',
            data: {
                shop_name: '7-Eleven สาขา 05432 (Mock)',
                date: '10/03/2026',
                time: '12:45',
                total_amount: '520.00',
                receipt_no: 'INV-99281'
            }
        });

    } catch (error) {
        console.error('API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
