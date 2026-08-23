import OpenAI from 'openai';
import { logger } from '../config/logger';

export interface PreVisitSummary {
  urgencyLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  chiefComplaint: string;
  suggestedQuestions: string[];
}

export interface PostVisitSummary {
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
  /**
   * Pre-visit summary guidance:
   * "Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: <symptoms>"
   */
  async generatePreVisitSummary(
    symptoms: string,
    duration?: string,
    severity?: string
  ): Promise<PreVisitSummary | null> {
    const client = createOpenAIClient();

    // Deterministic fallback if no live OpenAI key is configured
    if (!client) {
      logger.info('LLM client not configured - generating deterministic clinical triage summary');
      let urgency: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
      const s = (symptoms + ' ' + (severity || '')).toLowerCase();
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

    const prompt = `Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor.

Symptoms: ${symptoms}
Duration: ${duration || 'Not specified'}
Severity: ${severity || 'Not specified'}

Return ONLY a valid JSON object matching this schema:
{
  "urgencyLevel": "Low" | "Medium" | "High",
  "chiefComplaint": "1-2 sentence description",
  "suggestedQuestions": ["question 1", "question 2", "question 3"]
}`;

    try {
      const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an AI clinical assistant for a medical scheduling platform. You analyze patient symptoms for doctor preparation. Return valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
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

  /**
   * Post-visit summary guidance:
   * "Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: <notes>"
   */
  async generatePostVisitSummary(
    notes: string,
    medications: any[] = [],
    prescriptions: any[] = []
  ): Promise<PostVisitSummary | null> {
    const client = createOpenAIClient();

    // Deterministic structured care plan fallback if no live OpenAI key configured
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
      ? medications.map(m => `${m.name} ${m.dosage} - ${m.frequency} for ${m.durationDays} days${m.instructions ? ' (' + m.instructions + ')' : ''}`).join('\n')
      : 'No new medications';

    const prompt = `Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps:

Clinical Notes: ${notes}
Prescribed Medications:
${medList}

Return ONLY a valid JSON object matching this schema:
{
  "visitSummary": "clear 2-3 sentence plain language explanation for patient",
  "keyInstructions": ["instruction 1", "instruction 2"],
  "medicationSchedule": [
    { "name": "med name", "dosage": "dose", "frequency": "timing", "instructions": "how to take" }
  ],
  "followUpSteps": ["step 1", "step 2"],
  "warnings": ["warning or red-flag symptom"]
}`;

    try {
      const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant that translates clinical notes into empathetic, easily readable instructions for patients. Return valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
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