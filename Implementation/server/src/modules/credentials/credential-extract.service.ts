import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '@/config/env';
import { extractQrUrlFromPdf } from './qr-verify.service';

export interface ExtractedCredentialFields {
  title?:         string;
  issuer?:        string;
  certificateId?: string;
  session?:       string;
  year?:          number;
  tier?:          'pass' | 'elite' | 'elite_silver' | 'elite_gold';
  qrUrl?:         string;
  usedFallback:   boolean;
}

const PROMPT = `You are extracting structured metadata from an academic or industry certificate (PDF or image).
Return ONLY valid JSON (no markdown fences, no commentary) with these keys:
{
  "title": "Exact course, hackathon, or achievement name (string or null)",
  "issuer": "Issuing organization e.g. NPTEL, AWS, Coursera, Ministry of Education (string or null)",
  "certificateId": "Certificate ID, Roll/Serial number, or Credential ID printed on the certificate (string or null)",
  "session": "Session or date range e.g. Jul-Sep 2025 or Oct 2026 (string or null)",
  "year": 2025,
  "tier": "One of: elite_gold | elite_silver | elite | pass (based on score/badge: >=90% or Gold/1st -> elite_gold, 75-89% or Silver/Finalist -> elite_silver, 60-74% or Elite/Certified -> elite, otherwise pass)",
  "qrUrl": "Any verification URL printed or linked on the certificate, if visible (string or null)"
}`;

export async function extractCredentialFromFile(
  file: Express.Multer.File,
): Promise<ExtractedCredentialFields> {
  try {
    const buffer = fs.readFileSync(file.path);
    const pdfQrUrl = await extractQrUrlFromPdf(file.path);

    if (!env.LLM_API_KEY) {
      return {
        qrUrl: pdfQrUrl ?? undefined,
        usedFallback: true,
      };
    }

    const ai = new GoogleGenerativeAI(env.LLM_API_KEY);
    const model = ai.getGenerativeModel({ model: env.LLM_MODEL });

    const result = await model.generateContent([
      { text: PROMPT },
      {
        inlineData: {
          mimeType: file.mimetype || 'application/pdf',
          data: buffer.toString('base64'),
        },
      },
    ]);

    const raw = result.response.text().trim();
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const validTiers = new Set(['pass', 'elite', 'elite_silver', 'elite_gold']);
    const tier = typeof parsed.tier === 'string' && validTiers.has(parsed.tier)
      ? (parsed.tier as ExtractedCredentialFields['tier'])
      : undefined;

    return {
      title:         typeof parsed.title === 'string' ? parsed.title.trim() : undefined,
      issuer:        typeof parsed.issuer === 'string' ? parsed.issuer.trim() : undefined,
      certificateId: typeof parsed.certificateId === 'string' ? parsed.certificateId.trim() : undefined,
      session:       typeof parsed.session === 'string' ? parsed.session.trim() : undefined,
      year:          typeof parsed.year === 'number' ? parsed.year : undefined,
      tier,
      qrUrl:         pdfQrUrl ?? (typeof parsed.qrUrl === 'string' ? parsed.qrUrl.trim() : undefined),
      usedFallback:  false,
    };
  } catch {
    const pdfQrUrl = await extractQrUrlFromPdf(file.path).catch(() => null);
    return {
      qrUrl: pdfQrUrl ?? undefined,
      usedFallback: true,
    };
  } finally {
    // Clean up temporary upload used solely for extraction
    fs.unlink(file.path, () => {});
  }
}
