import { NextRequest, NextResponse } from "next/server";
// @ts-ignore
import pdfParseRaw from "pdf-parse";
const pdfParse = typeof pdfParseRaw === "function" ? pdfParseRaw : (pdfParseRaw as any).default || pdfParseRaw;
import mammoth from "mammoth";
import Tesseract from "tesseract.js";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Check file type by name
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.pdf')) {
      const data = await pdfParse(buffer);
      return NextResponse.json({ text: data.text });
    } else if (fileName.endsWith('.docx')) {
      const data = await mammoth.extractRawText({ buffer });
      return NextResponse.json({ text: data.value });
    } else if (fileName.endsWith('.png') || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) {
      const worker = await Tesseract.createWorker('eng+vie');
      const ret = await worker.recognize(buffer);
      await worker.terminate();
      return NextResponse.json({ text: ret.data.text });
    } else {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("CV parse error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
