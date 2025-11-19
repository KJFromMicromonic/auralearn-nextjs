import { generateStructuredResponse } from './mistralai-client';
import { AdaptabilityChallenge } from './adaptability-challenges-service';
import { LearningProfileSummary } from './parent-dashboard-service';

export interface ChallengeGuidance {
  preparationTips: string[];
  coachingSteps: string[];
  encouragement: string;
  reflectionQuestions: string[];
  whenToUse: string;
}

interface GuidanceParams {
  challenge: AdaptabilityChallenge;
  studentName: string;
  learningProfile?: LearningProfileSummary | null;
}

const fallbackGuidance = (challenge: AdaptabilityChallenge): ChallengeGuidance => ({
  preparationTips: [
    'Review the challenge steps together and gather any materials you may need.',
    'Remind your child that this is about practicing flexibility, not getting everything perfect.',
  ],
  coachingSteps: challenge.instructions.slice(0, 3),
  encouragement: 'Celebrate small wins and highlight times your child tries a new approach.',
  reflectionQuestions: [
    'What felt different about this challenge?',
    'What would you try next time to make it even better?',
  ],
  whenToUse: challenge.estimatedTime ? `Great for ${challenge.estimatedTime}` : 'Use whenever you have 5-10 minutes together.',
});

function buildGuidancePrompt({ challenge, studentName, learningProfile }: GuidanceParams): string {
  return `Create a short coaching plan for a parent guiding their child through the following adaptability challenge:

Challenge: ${challenge.title}
Description: ${challenge.description}
Why it helps: ${challenge.whyItHelps}
Instructions: ${challenge.instructions.join(' | ')}

Student context:
- Name: ${studentName}
- Strengths: ${learningProfile?.primaryStrengths?.join(', ') || 'not specified'}
- Areas for support: ${learningProfile?.areasForSupport?.join(', ') || 'not specified'}
- Learning profile summary: ${learningProfile?.profileSummary || 'not specified'}

Provide:
1. 2-3 preparation tips for parents
2. 3-4 coaching steps (plain language)
3. Friendly encouragement paragraph
4. 2-3 reflection questions for after the challenge
5. Advice on when to use this challenge (best time/context)

Tone: warm, practical, confidence-building.`;
}

function getGuidanceSchema(): Record<string, unknown> {
  return {
    preparationTips: ['string'],
    coachingSteps: ['string'],
    encouragement: 'string',
    reflectionQuestions: ['string'],
    whenToUse: 'string',
  };
}

export async function getChallengeGuidance(params: GuidanceParams): Promise<ChallengeGuidance> {
  try {
    const prompt = buildGuidancePrompt(params);
    const guidance = await generateStructuredResponse<ChallengeGuidance>(
      prompt,
      'You are a supportive parent coach who explains adaptability challenges in family-friendly language.',
      getGuidanceSchema()
    );

    if (!guidance) {
      return fallbackGuidance(params.challenge);
    }

    return guidance;
  } catch (error) {
    console.error('Error generating challenge guidance:', error);
    return fallbackGuidance(params.challenge);
  }
}


