import OpenAI from 'openai';
import { logger } from '../config/logger';

interface PreVisitSummary {
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  chiefComplaint: string;
  suggestedQuestions: string[];
}

interface PostVisitSummary {
  visitSummary: string;
  keyInstructions: string[];
  medicationSchedule: Array<{
    name: string;
    dosage: string;
    frequency: string;
    instructions: string;
  }>;
  followUpSteps: string[];
  warnings: string[];
}

function createOpenAIClient(): OpenAI | null {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey || apiKey.startsWith('sk-placeholder')) {
    logger.warn('LLM API key not configured - AI features will be unavailable');
    return null;
  }
  return new OpenAI({ apiKey, timeout: 30000 });
}

const MODEL = process.env.LLM_MODEL || 'gpt-4o-mini';

export const llmService = {
  async generatePreVisitSummary(
    symptoms: string,
    duration: string,
    severity: string
  ): Promise<PreVisitSummary | null> {
    const client = createOpenAIClient();
    if (!client) {
      logger.info('LLM client not available - returning null for pre-visit summary');
      return null;
    }

    const prompt = `You are a clinical assistant helping a doctor prepare for a patient visit.
Analyze these patient-reported symptoms and return ONLY a JSON object with no other text.

IMPORTANT: This is for clinical assistance only, NOT a medical diagnosis.

Return this exact JSON structure:
{
  "urgencyLevel": "Low" or "Medium" or "High",
  "chiefComplaint": "brief summary of the main complaint",
  "suggestedQuestions": ["question 1", "question 2", "question 3"]
}

Patient Symptoms: ${symptoms}
Duration: ${duration || 'Not specified'}
Severity: ${severity || 'Not specified'}

Rules:
- urgencyLevel must be exactly "Low", "Medium", or "High"
- chiefComplaint should be 1-2 sentences
- suggestedQuestions must be exactly 3 relevant follow-up questions for the doctor
- Return ONLY the JSON, no preamble or explanation`;

    try {
      const response = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        logger.warn('LLM returned empty content for pre-visit summary');
        return null;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        logger.error('LLM returned invalid JSON for pre-visit summary', { content });
        return null;
      }

      // Validate and normalize the response
      const urgencyMap: Record<string, PreVisitSummary['urgencyLevel']> = {
        'low': 'LOW', 'Low': 'LOW', 'LOW': 'LOW',
        'medium': 'MEDIUM', 'Medium': 'MEDIUM', 'MEDIUM': 'MEDIUM',
        'high': 'HIGH', 'High': 'HIGH', 'HIGH': 'HIGH',
      };

      const urgency = urgencyMap[parsed.urgencyLevel];
      if (!urgency) {
        logger.warn('LLM returned invalid urgency level', { urgency: parsed.urgencyLevel });
        return null;
      }

      if (!parsed.chiefComplaint || typeof parsed.chiefComplaint !== 'string') {
        logger.warn('LLM missing chiefComplaint field');
        return null;
      }

      if (!Array.isArray(parsed.suggestedQuestions) || parsed.suggestedQuestions.length < 1) {
        logger.warn('LLM missing suggestedQuestions');
        return null;
      }

      const result: PreVisitSummary = {
        urgencyLevel: urgency,
        chiefComplaint: parsed.chiefComplaint.trim(),
        suggestedQuestions: parsed.suggestedQuestions.slice(0, 3).map((q: any) => String(q).trim()),
      };

      // Ensure exactly 3 questions
      while (result.suggestedQuestions.length < 3) {
        result.suggestedQuestions.push('Are there any other symptoms you would like to discuss?');
      }

      logger.info('Pre-visit LLM summary generated successfully', { urgency: result.urgencyLevel });
      return result;

    } catch (err: any) {
      // Comprehensive error handling - LLM failure must NEVER break the application
      if (err.status === 401) {
        logger.error('LLM API key is invalid or unauthorized');
      } else if (err.status === 429) {
        logger.warn('LLM API rate limit reached');
      } else if (err.status === 503 || err.status === 500) {
        logger.warn('LLM API is temporarily unavailable');
      } else if (err.name === 'APIConnectionTimeoutError' || err.code === 'ETIMEDOUT') {
        logger.warn('LLM API request timed out');
      } else {
        logger.error('LLM API unexpected error', { error: err.message, code: err.status });
      }
      return null; // NEVER throw - return null to signal unavailability
    }
  },

  async generatePostVisitSummary(
    notes: string,
    medications: any[],
    prescriptions: any[]
  ): Promise<PostVisitSummary | null> {
    const client = createOpenAIClient();
    if (!client) {
      logger.info('LLM client not available - returning null for post-visit summary');
      return null;
    }

    const medList = medications.length > 0
      ? medications.map(m => `${m.name} ${m.dosage} - ${m.frequency} for ${m.durationDays} days${m.instructions ? ' - ' + m.instructions : ''}`).join('\n')
      : 'No medications prescribed';

    const prescriptionNotes = prescriptions.length > 0
      ? prescriptions.map(p => [p.diagnosis, p.notes].filter(Boolean).join(' | ')).join('\n')
      : '';

    const prompt = `You are helping a doctor communicate medical visit information to a patient in plain, friendly language.
Convert these clinical notes into a patient-friendly summary. Return ONLY a JSON object.

Clinical Notes: ${notes}
${prescriptionNotes ? `Diagnosis/Assessment: ${prescriptionNotes}` : ''}
Prescribed Medications:
${medList}

Return this exact JSON structure:
{
  "visitSummary": "2-3 sentence plain-language summary of the visit",
  "keyInstructions": ["instruction 1", "instruction 2", "instruction 3"],
  "medicationSchedule": [{"name": "med name", "dosage": "dosage", "frequency": "frequency", "instructions": "how to take it"}],
  "followUpSteps": ["step 1", "step 2"],
  "warnings": ["warning 1"]
}

Rules:
- Use simple, patient-friendly language (no medical jargon)
- visitSummary should be reassuring and clear
- Include at least 2 keyInstructions
- medicationSchedule should match the prescribed medications
- warnings should include important precautions or red flag symptoms to watch for
- Return ONLY valid JSON`;

    try {
      const response = await client.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return null;

      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        logger.error('LLM returned invalid JSON for post-visit summary');
        return null;
      }

      const result: PostVisitSummary = {
        visitSummary: parsed.visitSummary || 'Summary of your visit.',
        keyInstructions: Array.isArray(parsed.keyInstructions) ? parsed.keyInstructions : [],
        medicationSchedule: Array.isArray(parsed.medicationSchedule) ? parsed.medicationSchedule : [],
        followUpSteps: Array.isArray(parsed.followUpSteps) ? parsed.followUpSteps : [],
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      };

      logger.info('Post-visit LLM summary generated successfully');
      return result;

    } catch (err: any) {
      if (err.status === 401) logger.error('LLM API key invalid for post-visit summary');
      else if (err.status === 429) logger.warn('LLM rate limit reached for post-visit summary');
      else logger.error('Post-visit LLM summary failed', { error: err.message });
      return null; // NEVER throw
    }
  },
};