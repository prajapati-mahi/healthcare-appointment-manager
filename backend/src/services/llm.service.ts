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
  if (!apiKey || apiKey.startsWith('sk-placeholder') || apiKey.length < 10) {
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

    // Fallback heuristic if no live LLM key configured
    if (!client) {
      logger.info('LLM client not configured - generating deterministic clinical triage summary');
      let urgency: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
      const s = (symptoms + ' ' + severity).toLowerCase();
      if (s.includes('severe') || s.includes('chest pain') || s.includes('shortness of breath') || s.includes('high fever')) {
        urgency = 'HIGH';
      } else if (s.includes('mild') || s.includes('minor') || s.includes('routine')) {
        urgency = 'LOW';
      }

      return {
        urgencyLevel: urgency,
        chiefComplaint: `Patient reports: ${symptoms} (Duration: ${duration || 'unspecified'}, Severity: ${severity || 'moderate'}).`,
        suggestedQuestions: [
          'How have the symptoms progressed since the initial onset?',
          'Are you currently taking any over-the-counter medications for relief?',
          'Have you experienced similar symptoms in the past?',
        ],
      };
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
      if (!content) return null;

      const parsed = JSON.parse(content);
      const urgencyMap: Record<string, PreVisitSummary['urgencyLevel']> = {
        'low': 'LOW', 'Low': 'LOW', 'LOW': 'LOW',
        'medium': 'MEDIUM', 'Medium': 'MEDIUM', 'MEDIUM': 'MEDIUM',
        'high': 'HIGH', 'High': 'HIGH', 'HIGH': 'HIGH',
      };

      return {
        urgencyLevel: urgencyMap[parsed.urgencyLevel] || 'MEDIUM',
        chiefComplaint: (parsed.chiefComplaint || symptoms).trim(),
        suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
          ? parsed.suggestedQuestions.slice(0, 3)
          : ['How long have symptoms lasted?', 'Any medication allergies?', 'Any prior medical conditions?'],
      };
    } catch (err: any) {
      logger.warn('Pre-visit LLM generation error', { error: err.message });
      return null;
    }
  },

  async generatePostVisitSummary(
    notes: string,
    medications: any[],
    prescriptions: any[]
  ): Promise<PostVisitSummary | null> {
    const client = createOpenAIClient();

    // Fallback structured generation if no live LLM key configured
    if (!client) {
      logger.info('LLM client not configured - generating structured patient care summary from clinical notes');
      return {
        visitSummary: `Summary of your consultation: ${notes.slice(0, 200)}. Your doctor has reviewed your condition and prescribed appropriate care.`,
        keyInstructions: [
          'Follow the prescribed medication routine closely.',
          'Get adequate rest and stay well-hydrated throughout recovery.',
          'Schedule a follow-up appointment if symptoms persist beyond the prescribed course.',
        ],
        medicationSchedule: medications.map((m) => ({
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          instructions: m.instructions || 'Take as directed by doctor',
        })),
        followUpSteps: ['Monitor your symptoms daily', 'Return for follow-up evaluation if required'],
        warnings: [
          'Contact clinic or emergency care if you develop high fever, difficulty breathing, or severe pain.',
        ],
      };
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

      const parsed = JSON.parse(content);
      return {
        visitSummary: parsed.visitSummary || 'Summary of your visit.',
        keyInstructions: Array.isArray(parsed.keyInstructions) ? parsed.keyInstructions : [],
        medicationSchedule: Array.isArray(parsed.medicationSchedule) ? parsed.medicationSchedule : [],
        followUpSteps: Array.isArray(parsed.followUpSteps) ? parsed.followUpSteps : [],
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      };
    } catch (err: any) {
      logger.error('Post-visit LLM summary failed', { error: err.message });
      return null;
    }
  },
};