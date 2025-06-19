import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import TurndownService from "turndown";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // 取得 multipart form 資料
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    // 讀取 PDF buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // 解析 PDF
    const pdfData = await pdfParse(buffer);
    // 轉 markdown
    const turndownService = new TurndownService();
    const markdown = turndownService.turndown(pdfData.text);
    console.log("PDF 轉換成功",markdown);
    return NextResponse.json({ markdown });
  } catch (e) {
    console.error("PDF 轉 markdown 失敗", e);
    return NextResponse.json({ error: "Failed to parse PDF" }, { status: 500 });
  }
}
