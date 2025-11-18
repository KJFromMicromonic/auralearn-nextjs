/**
 * Adaptability Challenges Service
 * 
 * Manages the catalog of adaptability challenges organized by 6 pillars
 * to build cognitive flexibility, resilience, and executive functions.
 */

export type ChallengePillar = 
  | 'strategy_switching'
  | 'productive_struggle'
  | 'slow_thinking'
  | 'fast_thinking'
  | 'creativity'
  | 'emotional_adaptability';

export type ChallengeLevel = 'easy' | 'medium' | 'hard';
export type ChallengeFormat = 'micro_task' | 'mission' | 'quest' | 'reflection' | 'co_challenge';
export type ChallengeMood = 'fun' | 'focus' | 'challenge' | 'creative';

export interface AdaptabilityChallenge {
  id: string;
  pillar: ChallengePillar;
  level: ChallengeLevel;
  format: ChallengeFormat;
  mood: ChallengeMood;
  title: string;
  description: string;
  instructions: string[];
  whyItHelps: string;
  estimatedTime: string; // e.g., "2-5 min", "10 min", "15-20 min"
  subject?: string; // Optional: math, reading, writing, science, general
  tags: string[]; // fast-thinker, slow-thinker, ADHD-friendly, etc.
  materials?: string[];
  extensions?: string[]; // Optional extensions for high performers
  adaptabilityGoal: string; // What flexibility this builds
  parentInstructions?: string; // 2-sentence explanation for parents
}

export interface ChallengeProgress {
  challengeId: string;
  studentId: string;
  completedAt: string;
  level: ChallengeLevel;
  reflection?: {
    whatWasHardest?: string;
    whatChanged?: string;
    whatSurprised?: string;
  };
  parentNotes?: string;
}

export interface WeeklyChallenge {
  challenge: AdaptabilityChallenge;
  assignedDate: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  progress?: ChallengeProgress;
}

/**
 * Get pillar display name
 */
export function getPillarName(pillar: ChallengePillar): string {
  const names: Record<ChallengePillar, string> = {
    strategy_switching: 'Strategy Switching',
    productive_struggle: 'Productive Struggle',
    slow_thinking: 'Slow Thinking & Deep Focus',
    fast_thinking: 'Fast Thinking Activation',
    creativity: 'Creativity & Divergent Thinking',
    emotional_adaptability: 'Emotional Adaptability',
  };
  return names[pillar];
}

/**
 * Get pillar description
 */
export function getPillarDescription(pillar: ChallengePillar): string {
  const descriptions: Record<ChallengePillar, string> = {
    strategy_switching: 'Helps avoid "one fixed way" of solving problems. Strengthens cognitive flexibility and multi-modal reasoning.',
    productive_struggle: 'Gently increases willingness to stay with hard tasks. Trains perseverance, grit, and discomfort tolerance.',
    slow_thinking: 'For fast processors who rush. Develops metacognition, patience, accuracy, and executive control.',
    fast_thinking: 'For slow or hesitant thinkers. Builds decision speed, intuition, and confidence.',
    creativity: 'Breaks rigid thought patterns. Encourages flexible thinking and creative problem solving.',
    emotional_adaptability: 'Teaches emotional flexibility around learning. Strengthens resilience, emotional regulation, and growth mindset.',
  };
  return descriptions[pillar];
}

/**
 * Get challenges catalog
 * This would typically come from a database, but for now we'll use a curated set
 */
export function getChallengesCatalog(): AdaptabilityChallenge[] {
  // This is a sample catalog - in production, this would come from a database
  // with 120-180 challenges across all pillars and levels
  return [
    // Strategy Switching - Easy
    {
      id: 'ss-001-easy',
      pillar: 'strategy_switching',
      level: 'easy',
      format: 'micro_task',
      mood: 'fun',
      title: 'Two Ways to Solve',
      description: 'Solve the same problem using two different methods',
      instructions: [
        'Pick a math problem you know how to solve',
        'Solve it using your usual method',
        'Now solve it again using a completely different approach',
        'Compare: Which method felt easier? Which was faster?'
      ],
      whyItHelps: 'Strengthens cognitive flexibility by showing there are multiple valid paths to the same answer.',
      estimatedTime: '5-10 min',
      subject: 'math',
      tags: ['fast-thinker', 'slow-thinker', 'visual-learner', 'logical-learner'],
      adaptabilityGoal: 'Cognitive flexibility and multi-modal reasoning',
      parentInstructions: 'This helps your child see that problems can be solved in multiple ways, reducing rigidity in thinking.',
    },
    {
      id: 'ss-002-easy',
      pillar: 'strategy_switching',
      level: 'easy',
      format: 'micro_task',
      mood: 'creative',
      title: 'Draw Then Write',
      description: 'Draw your answer, then rewrite it as text',
      instructions: [
        'Think of a story or explanation',
        'Draw it first with pictures',
        'Now write the same idea in words',
        'Notice how drawing and writing use different parts of your brain'
      ],
      whyItHelps: 'Switches between visual and verbal processing, building cognitive flexibility.',
      estimatedTime: '5-10 min',
      subject: 'writing',
      tags: ['visual-learner', 'verbal-learner'],
      adaptabilityGoal: 'Multi-modal reasoning and cognitive switching',
      parentInstructions: 'This exercise helps children switch between visual and verbal thinking, a key executive function skill.',
    },
    // Productive Struggle - Easy
    {
      id: 'ps-001-easy',
      pillar: 'productive_struggle',
      level: 'easy',
      format: 'mission',
      mood: 'challenge',
      title: 'One Harder Problem',
      description: 'Try a problem 20% harder than your usual level',
      instructions: [
        'Find a problem that feels just a bit too hard',
        'Set a timer for 5 minutes',
        'Try your best without giving up',
        'After 5 minutes, take a break and celebrate trying!'
      ],
      whyItHelps: 'Builds tolerance for difficulty and teaches that struggle is part of learning.',
      estimatedTime: '5-10 min',
      subject: 'math',
      tags: ['fast-thinker', 'gifted', 'low-motivation'],
      adaptabilityGoal: 'Perseverance, grit, and discomfort tolerance',
      parentInstructions: 'This gently pushes your child to try harder problems, building resilience and growth mindset.',
    },
    // Slow Thinking - Easy
    {
      id: 'st-001-easy',
      pillar: 'slow_thinking',
      level: 'easy',
      format: 'micro_task',
      mood: 'focus',
      title: 'Slow Down Challenge',
      description: 'Solve this problem SLOWLY on purpose',
      instructions: [
        'Pick a problem you could solve quickly',
        'Set a timer for double your usual time',
        'Go step by step, checking each part',
        'Notice what details you see when you slow down'
      ],
      whyItHelps: 'Develops metacognition and attention to detail for fast processors.',
      estimatedTime: '5-10 min',
      subject: 'math',
      tags: ['fast-thinker', 'fast-processor', 'inattentive'],
      adaptabilityGoal: 'Metacognition, patience, and executive control',
      parentInstructions: 'This helps fast thinkers practice slowing down and noticing details, improving accuracy.',
    },
    // Fast Thinking - Easy
    {
      id: 'ft-001-easy',
      pillar: 'fast_thinking',
      level: 'easy',
      format: 'micro_task',
      mood: 'fun',
      title: 'Flash Challenge',
      description: 'Answer as fast as you can in 30 seconds',
      instructions: [
        'Get ready with a timer',
        'When the timer starts, answer as many questions as you can',
        'Don\'t worry about being perfect - just go!',
        'Celebrate how many you got right!'
      ],
      whyItHelps: 'Builds decision speed and confidence for hesitant thinkers.',
      estimatedTime: '2-5 min',
      subject: 'math',
      tags: ['slow-thinker', 'slow-processing', 'low-confidence'],
      adaptabilityGoal: 'Decision speed, intuition, and confidence',
      parentInstructions: 'This quick exercise helps hesitant children practice making decisions faster, building confidence.',
    },
    // Creativity - Easy
    {
      id: 'cr-001-easy',
      pillar: 'creativity',
      level: 'easy',
      format: 'mission',
      mood: 'creative',
      title: 'Three Endings',
      description: 'Invent 3 different endings to a story',
      instructions: [
        'Read or think of a story',
        'Come up with 3 completely different endings',
        'One happy, one surprising, one funny',
        'Share all three and see which you like best!'
      ],
      whyItHelps: 'Encourages flexible thinking and breaks rigid thought patterns.',
      estimatedTime: '10 min',
      subject: 'writing',
      tags: ['bored', 'gifted', 'visual-learner'],
      adaptabilityGoal: 'Flexible thinking and creative problem solving',
      parentInstructions: 'This exercise encourages your child to think of multiple possibilities, building creative flexibility.',
    },
    // Emotional Adaptability - Easy
    {
      id: 'ea-001-easy',
      pillar: 'emotional_adaptability',
      level: 'easy',
      format: 'reflection',
      mood: 'focus',
      title: 'Frustration Check-In',
      description: 'Tell me what frustrated you today and what you did next',
      instructions: [
        'Think of one time today you felt frustrated',
        'What made you feel that way?',
        'What did you do next?',
        'What would you try differently next time?'
      ],
      whyItHelps: 'Strengthens emotional regulation and teaches reflection on difficult moments.',
      estimatedTime: '5 min',
      tags: ['easily-distracted', 'sensitive-low-confidence', 'anxiety'],
      adaptabilityGoal: 'Resilience, emotional regulation, and growth mindset',
      parentInstructions: 'This reflection helps your child process frustration and learn from difficult moments.',
    },
    // Strategy Switching - Medium & Hard
    {
      id: 'ss-003-medium',
      pillar: 'strategy_switching',
      level: 'medium',
      format: 'mission',
      mood: 'challenge',
      title: 'Explain to a 6-Year-Old',
      description: 'Explain how you\'d teach this problem to a 6-year-old',
      instructions: [
        'Pick a concept you understand',
        'Imagine explaining it to a 6-year-old',
        'Use simple words and examples',
        'Notice how explaining changes your understanding'
      ],
      whyItHelps: 'Forces perspective shift and deeper understanding through teaching.',
      estimatedTime: '10-15 min',
      tags: ['fast-thinker', 'gifted', 'logical-learner'],
      adaptabilityGoal: 'Perspective shifting and deeper understanding',
      parentInstructions: 'This challenge helps children see concepts from new angles by explaining them simply.',
    },
    {
      id: 'ss-004-medium',
      pillar: 'strategy_switching',
      level: 'medium',
      format: 'mission',
      mood: 'creative',
      title: 'Switch Learning Modes',
      description: 'Switch from visual to verbal approach (or vice versa)',
      instructions: [
        'Start with your preferred learning style',
        'Complete the task using that style',
        'Now do the same task using a different style',
        'Compare: What was easier? What was harder?'
      ],
      whyItHelps: 'Builds cognitive flexibility by practicing non-preferred approaches.',
      estimatedTime: '15 min',
      tags: ['visual-learner', 'verbal-learner'],
      adaptabilityGoal: 'Multi-modal reasoning and cognitive switching',
      parentInstructions: 'This helps children become comfortable with different learning approaches, building flexibility.',
    },
    // Productive Struggle - Medium & Hard
    {
      id: 'ps-002-medium',
      pillar: 'productive_struggle',
      level: 'medium',
      format: 'mission',
      mood: 'challenge',
      title: 'Stay Focused Challenge',
      description: 'Time yourself: stay focused for 2 more minutes after feeling stuck',
      instructions: [
        'Start a challenging task',
        'When you feel like giving up, set a timer for 2 more minutes',
        'Keep trying for those 2 minutes',
        'Celebrate that you didn\'t quit!'
      ],
      whyItHelps: 'Builds tolerance for difficulty and teaches persistence.',
      estimatedTime: '10-15 min',
      tags: ['easily-distracted', 'low-motivation'],
      adaptabilityGoal: 'Perseverance and discomfort tolerance',
      parentInstructions: 'This teaches your child to push through frustration, building resilience.',
    },
    {
      id: 'ps-003-hard',
      pillar: 'productive_struggle',
      level: 'hard',
      format: 'quest',
      mood: 'challenge',
      title: 'Almost Impossible Question',
      description: 'Do one "almost impossible" question per week',
      instructions: [
        'Find a problem that feels way too hard',
        'Spend 10-15 minutes trying',
        'It\'s okay if you don\'t solve it - the trying is what matters',
        'Talk about what you learned from trying'
      ],
      whyItHelps: 'Normalizes struggle and builds growth mindset.',
      estimatedTime: '15-20 min',
      tags: ['gifted', 'bored', 'fast-thinker'],
      adaptabilityGoal: 'Grit, growth mindset, and challenge tolerance',
      parentInstructions: 'This helps gifted children experience productive struggle, which is essential for growth.',
    },
    // Slow Thinking - Medium & Hard
    {
      id: 'st-002-medium',
      pillar: 'slow_thinking',
      level: 'medium',
      format: 'mission',
      mood: 'focus',
      title: 'No-Erase Challenge',
      description: 'Think before writing anything - no erasing allowed',
      instructions: [
        'Get a problem or task',
        'Think through your entire approach first',
        'Write your answer without erasing',
        'Check your work step by step'
      ],
      whyItHelps: 'Develops planning and metacognitive skills.',
      estimatedTime: '10-15 min',
      tags: ['fast-thinker', 'fast-processor', 'inattentive'],
      adaptabilityGoal: 'Metacognition, planning, and executive control',
      parentInstructions: 'This helps fast thinkers practice slowing down and planning ahead.',
    },
    // Fast Thinking - Medium & Hard
    {
      id: 'ft-002-medium',
      pillar: 'fast_thinking',
      level: 'medium',
      format: 'micro_task',
      mood: 'fun',
      title: 'Predict Before Solving',
      description: 'Predict the answer before solving it fully',
      instructions: [
        'Look at a problem',
        'Make a quick guess about the answer',
        'Now solve it properly',
        'See how close your prediction was!'
      ],
      whyItHelps: 'Builds intuition and quick reasoning skills.',
      estimatedTime: '5-10 min',
      tags: ['slow-thinker', 'slow-processing'],
      adaptabilityGoal: 'Intuition, quick reasoning, and confidence',
      parentInstructions: 'This helps hesitant children practice making quick decisions, building confidence.',
    },
    // Creativity - Medium & Hard
    {
      id: 'cr-002-medium',
      pillar: 'creativity',
      level: 'medium',
      format: 'mission',
      mood: 'creative',
      title: 'Create Your Own Problem',
      description: 'Create a problem for someone else to solve',
      instructions: [
        'Think of a topic you know well',
        'Create a problem or puzzle about it',
        'Make it interesting but solvable',
        'Share it with a family member!'
      ],
      whyItHelps: 'Encourages flexible thinking and perspective-taking.',
      estimatedTime: '15 min',
      tags: ['gifted', 'bored', 'logical-learner'],
      adaptabilityGoal: 'Creative problem solving and perspective-taking',
      parentInstructions: 'This exercise helps children think from a creator\'s perspective, building flexibility.',
    },
    // Emotional Adaptability - Medium & Hard
    {
      id: 'ea-002-medium',
      pillar: 'emotional_adaptability',
      level: 'medium',
      format: 'reflection',
      mood: 'focus',
      title: 'Try Again Without Getting Upset',
      description: 'Try again using a different strategy without getting upset',
      instructions: [
        'Pick a task you struggled with',
        'Take 3 deep breaths',
        'Try a completely different approach',
        'Notice how you feel when you try something new'
      ],
      whyItHelps: 'Strengthens emotional regulation and flexibility.',
      estimatedTime: '10 min',
      tags: ['sensitive-low-confidence', 'anxiety', 'easily-distracted'],
      adaptabilityGoal: 'Emotional regulation and resilience',
      parentInstructions: 'This helps children practice managing frustration while trying new approaches.',
    },
    {
      id: 'ea-003-hard',
      pillar: 'emotional_adaptability',
      level: 'hard',
      format: 'quest',
      mood: 'challenge',
      title: 'Mistake Learning Journal',
      description: 'Explain one mistake you made and what you learned from it',
      instructions: [
        'Think of a mistake you made recently',
        'Write or talk about what happened',
        'What did you learn from it?',
        'How will you use this learning next time?'
      ],
      whyItHelps: 'Builds growth mindset and reframes mistakes as learning opportunities.',
      estimatedTime: '15-20 min',
      tags: ['sensitive-low-confidence', 'perfectionism'],
      adaptabilityGoal: 'Growth mindset and resilience',
      parentInstructions: 'This helps children see mistakes as valuable learning experiences, not failures.',
    },
    // Movement-based challenges (for ADHD/high energy)
    {
      id: 'mb-001-easy',
      pillar: 'strategy_switching',
      level: 'easy',
      format: 'co_challenge',
      mood: 'fun',
      title: 'Jump and Learn',
      description: 'Learn while jumping or moving',
      instructions: [
        'Pick a fact or concept to learn',
        'Jump once for each letter or number',
        'Say it out loud while jumping',
        'Try it sitting down - notice the difference!'
      ],
      whyItHelps: 'Uses movement to enhance learning and build flexibility.',
      estimatedTime: '5-10 min',
      tags: ['high-energy', 'ADHD-friendly', 'kinesthetic-learner'],
      materials: ['Space to move'],
      adaptabilityGoal: 'Embodied cognition and multi-modal learning',
      parentInstructions: 'This uses movement to help high-energy children learn while building flexibility.',
    },
    {
      id: 'mb-002-medium',
      pillar: 'emotional_adaptability',
      level: 'medium',
      format: 'co_challenge',
      mood: 'fun',
      title: 'Breathing Reset Challenge',
      description: 'Do a 1-minute breathing reset, then retry the task',
      instructions: [
        'When feeling frustrated, stop',
        'Take 4 deep breaths (in for 4, hold for 4, out for 4)',
        'Count to 10 slowly',
        'Now try the task again with fresh energy'
      ],
      whyItHelps: 'Teaches emotional regulation through breathing techniques.',
      estimatedTime: '5 min',
      tags: ['anxiety', 'high-energy', 'easily-distracted'],
      adaptabilityGoal: 'Emotional regulation and self-control',
      parentInstructions: 'This teaches children to use breathing to manage emotions, a valuable life skill.',
    },
  ];
}

/**
 * Get challenges filtered by criteria
 */
export function getChallengesByCriteria(filters: {
  pillar?: ChallengePillar;
  level?: ChallengeLevel;
  subject?: string;
  tags?: string[];
  format?: ChallengeFormat;
  mood?: ChallengeMood;
}): AdaptabilityChallenge[] {
  const allChallenges = getChallengesCatalog();
  
  return allChallenges.filter(challenge => {
    if (filters.pillar && challenge.pillar !== filters.pillar) return false;
    if (filters.level && challenge.level !== filters.level) return false;
    if (filters.subject && challenge.subject !== filters.subject) return false;
    if (filters.format && challenge.format !== filters.format) return false;
    if (filters.mood && challenge.mood !== filters.mood) return false;
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(tag => challenge.tags.includes(tag));
      if (!hasMatchingTag) return false;
    }
    return true;
  });
}

/**
 * Get recommended weekly challenge based on student profile
 */
export function getRecommendedWeeklyChallenge(
  studentProfile: {
    primaryCategory?: string;
    strengths?: string[];
    areasForSupport?: string[];
    recentChallenges?: string[];
  }
): AdaptabilityChallenge | null {
  const allChallenges = getChallengesCatalog();
  
  // Simple recommendation logic - in production, this would be more sophisticated
  // Match challenges to student profile
  let recommended: AdaptabilityChallenge[] = [];
  
  if (studentProfile.primaryCategory === 'fast_processor') {
    recommended = getChallengesByCriteria({ 
      pillar: 'slow_thinking', 
      level: 'easy',
      tags: ['fast-thinker']
    });
  } else if (studentProfile.primaryCategory === 'slow_processing') {
    recommended = getChallengesByCriteria({ 
      pillar: 'fast_thinking', 
      level: 'easy',
      tags: ['slow-thinker']
    });
  } else if (studentProfile.primaryCategory === 'easily_distracted') {
    recommended = getChallengesByCriteria({ 
      pillar: 'emotional_adaptability', 
      level: 'easy'
    });
  } else if (studentProfile.primaryCategory === 'high_energy') {
    recommended = getChallengesByCriteria({ 
      format: 'co_challenge',
      mood: 'fun'
    });
  } else {
    // Default: strategy switching for flexibility
    recommended = getChallengesByCriteria({ 
      pillar: 'strategy_switching', 
      level: 'easy'
    });
  }
  
  // Avoid recently completed challenges
  const filtered = recommended.filter(c => 
    !studentProfile.recentChallenges?.includes(c.id)
  );
  
  return filtered.length > 0 ? filtered[0] : (recommended.length > 0 ? recommended[0] : null);
}

/**
 * Get all pillars
 */
export function getAllPillars(): ChallengePillar[] {
  return [
    'strategy_switching',
    'productive_struggle',
    'slow_thinking',
    'fast_thinking',
    'creativity',
    'emotional_adaptability',
  ];
}

