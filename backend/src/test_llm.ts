import { llmService } from './services/llm.service';

async function testLLM() {
  console.log('--- 1. Testing Pre-Visit LLM Guidance Prompt ---');
  const pre = await llmService.generatePreVisitSummary(
    'Persistent dry cough and fever of 101F',
    '3 days',
    'Moderate'
  );
  console.log('Result:', JSON.stringify(pre, null, 2));

  console.log('\n--- 2. Testing Post-Visit LLM Guidance Prompt ---');
  const post = await llmService.generatePostVisitSummary(
    'Patient has acute viral bronchitis. Advised 5 days rest, hydration, and steam inhalation.',
    [
      {
        name: 'Amoxicillin',
        dosage: '500mg',
        frequency: 'Twice daily',
        durationDays: 5,
        instructions: 'Take after meals with water',
      },
    ],
    []
  );
  console.log('Result:', JSON.stringify(post, null, 2));
}

testLLM().catch(console.error);
