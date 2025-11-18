/**
 * Learning Categories Data
 * 
 * Static fallback data for learning categories when the database table
 * is not available. This should match the data in learning_categories table.
 */

export interface LearningCategory {
  category_key: string;
  category_name: string;
  description: string;
  characteristics: string[];
  teaching_strategies: string[];
  typical_behaviors: string[];
  improvement_tips: string[];
}

/**
 * Default learning categories data.
 * This matches the seed data in the learning_categories table.
 */
export const DEFAULT_LEARNING_CATEGORIES: LearningCategory[] = [
  {
    category_key: 'slow_processing',
    category_name: 'Slow Processing',
    description: 'Takes longer to process and respond to information',
    characteristics: [
      'Needs extra time to think',
      'Processes information thoroughly',
      'May struggle with timed tasks',
      'Benefits from step-by-step instruction',
    ],
    teaching_strategies: [
      'Break down tasks into smaller, manageable steps',
      'Provide extra time for processing information',
      'Use visual aids and hands-on materials',
      'Repeat instructions in different ways',
      'Check for understanding frequently',
    ],
    typical_behaviors: [
      'Takes longer to answer questions',
      'May appear hesitant',
      'Double-checks work frequently',
      'Prefers detailed explanations',
    ],
    improvement_tips: [
      'Practice with timed activities gradually',
      'Build confidence with achievable goals',
      'Use scaffolding techniques',
      'Celebrate progress, not speed',
    ],
  },
  {
    category_key: 'fast_processor',
    category_name: 'Fast Processor',
    description: 'Quickly grasps concepts and completes tasks ahead of peers',
    characteristics: [
      'Understands concepts quickly',
      'Finishes work early',
      'May become bored with repetition',
      'Seeks challenging material',
    ],
    teaching_strategies: [
      'Provide advanced materials and enrichment activities',
      'Encourage leadership roles in group work',
      'Offer independent study projects',
      'Challenge with higher-order thinking questions',
      'Assign mentoring roles to help other students',
    ],
    typical_behaviors: [
      'Finishes assignments early',
      'May rush through work',
      'Seeks additional challenges',
      'Can explain concepts to peers',
    ],
    improvement_tips: [
      'Encourage depth over speed',
      'Provide extension activities',
      'Foster critical thinking skills',
      'Challenge with complex problems',
    ],
  },
  {
    category_key: 'high_energy',
    category_name: 'High Energy',
    description: 'Needs movement and physical activity to learn effectively',
    characteristics: [
      'Fidgets or moves frequently',
      'Learns better with hands-on activities',
      'May struggle sitting still',
      'Energetic and enthusiastic',
    ],
    teaching_strategies: [
      'Incorporate movement breaks into lessons',
      'Use active learning strategies (games, group work)',
      'Provide fidget tools or flexible seating',
      'Channel energy into leadership activities',
      'Break lessons into shorter, focused segments',
    ],
    typical_behaviors: [
      'Difficulty sitting still',
      'Prefers hands-on learning',
      'Talks while working',
      'Energetic participation',
    ],
    improvement_tips: [
      'Provide structured movement opportunities',
      'Use kinesthetic learning activities',
      'Set clear expectations for movement times',
      'Channel energy positively',
    ],
  },
  {
    category_key: 'visual_learner',
    category_name: 'Visual Learner',
    description: 'Learns best through seeing and visualizing information',
    characteristics: [
      'Remembers what they see',
      'Prefers diagrams and charts',
      'Strong spatial awareness',
      'Likes color-coding and organization',
    ],
    teaching_strategies: [
      'Use diagrams, charts, and graphic organizers',
      'Incorporate videos and demonstrations',
      'Color-code materials and notes',
      'Use mind maps for complex concepts',
      'Provide written instructions alongside verbal',
    ],
    typical_behaviors: [
      'Draws pictures while learning',
      'Prefers written instructions',
      'Strong visual memory',
      'Organizes materials visually',
    ],
    improvement_tips: [
      'Teach note-taking with visual elements',
      'Encourage mind mapping',
      'Use color strategically',
      'Provide graphic organizers',
    ],
  },
  {
    category_key: 'auditory_learner',
    category_name: 'Auditory Learner',
    description: 'Learns best through listening and verbal instruction',
    characteristics: [
      'Remembers what they hear',
      'Enjoys discussions',
      'Talks through problems',
      'Strong verbal skills',
    ],
    teaching_strategies: [
      'Use verbal explanations and discussions',
      'Encourage reading aloud',
      'Incorporate music and rhythm',
      'Provide opportunities for verbal repetition',
      'Use storytelling techniques',
    ],
    typical_behaviors: [
      'Talks while working',
      'Prefers verbal instructions',
      'Enjoys group discussions',
      'Remembers spoken information well',
    ],
    improvement_tips: [
      'Encourage self-talk strategies',
      'Use recorded lessons',
      'Practice verbal rehearsal',
      'Incorporate music mnemonics',
    ],
  },
  {
    category_key: 'logical_learner',
    category_name: 'Logical Learner',
    description: 'Thinks in patterns, sequences, and logical connections',
    characteristics: [
      'Excels at patterns and sequences',
      'Enjoys problem-solving',
      'Asks "why" questions',
      'Likes organized information',
    ],
    teaching_strategies: [
      'Present information in a structured, sequential manner',
      'Use problem-solving activities and puzzles',
      'Connect lessons to real-world applications',
      'Encourage pattern recognition and categorization',
      'Provide opportunities for analysis and reasoning',
    ],
    typical_behaviors: [
      'Seeks logical explanations',
      'Enjoys math and science',
      'Likes puzzles and brain teasers',
      'Questions inconsistencies',
    ],
    improvement_tips: [
      'Provide logical frameworks',
      'Use deductive reasoning activities',
      'Connect concepts systematically',
      'Encourage analytical thinking',
    ],
  },
  {
    category_key: 'kinesthetic_learner',
    category_name: 'Kinesthetic Learner',
    description: 'Learns through touch, movement, and doing',
    characteristics: [
      'Learns by doing',
      'Needs hands-on activities',
      'Strong muscle memory',
      'Prefers active participation',
    ],
    teaching_strategies: [
      'Provide hands-on experiments and activities',
      'Use manipulatives and physical objects',
      'Incorporate role-playing and simulations',
      'Allow movement during learning',
      'Use gesture and body movement',
    ],
    typical_behaviors: [
      'Fidgets with objects',
      'Prefers lab work and experiments',
      'Uses gestures when explaining',
      'Learns through physical practice',
    ],
    improvement_tips: [
      'Maximize hands-on opportunities',
      'Use physical mnemonics',
      'Incorporate building/creating',
      'Allow active participation',
    ],
  },
  {
    category_key: 'sensitive_low_confidence',
    category_name: 'Sensitive/Low Confidence',
    description: 'Needs encouragement and supportive environment',
    characteristics: [
      'Hesitant to try new things',
      'Fears making mistakes',
      'Needs reassurance',
      'Emotionally aware',
    ],
    teaching_strategies: [
      'Build confidence through small, achievable goals',
      'Provide frequent, specific positive feedback',
      'Create a supportive, low-pressure environment',
      'Use private check-ins instead of public questioning',
      'Celebrate effort and progress, not just results',
    ],
    typical_behaviors: [
      'Asks for reassurance',
      'Avoids risks',
      'Upset by criticism',
      'Seeks approval',
    ],
    improvement_tips: [
      'Build on strengths first',
      'Normalize mistakes as learning',
      'Set achievable milestones',
      'Provide emotional support',
    ],
  },
  {
    category_key: 'easily_distracted',
    category_name: 'Easily Distracted',
    description: 'Struggles with focus and attention',
    characteristics: [
      'Attention wanders easily',
      'Sensitive to environmental stimuli',
      'Difficulty completing tasks',
      'Needs redirection',
    ],
    teaching_strategies: [
      'Seat near the front, away from distractions',
      'Use clear, concise instructions',
      'Break tasks into shorter intervals with breaks',
      'Provide fidget tools or sensory breaks',
      'Use visual and auditory cues to regain focus',
    ],
    typical_behaviors: [
      'Looks around frequently',
      'Starts tasks but doesn\'t finish',
      'Affected by noise/movement',
      'Needs frequent reminders',
    ],
    improvement_tips: [
      'Minimize environmental distractions',
      'Use timers and visual schedules',
      'Teach self-monitoring strategies',
      'Provide structured breaks',
    ],
  },
  {
    category_key: 'needs_repetition',
    category_name: 'Needs Repetition',
    description: 'Requires multiple exposures to master concepts',
    characteristics: [
      'Needs multiple examples',
      'Benefits from review',
      'Learns through practice',
      'Improves with repetition',
    ],
    teaching_strategies: [
      'Review previous lessons before introducing new material',
      'Use spaced repetition for key concepts',
      'Provide multiple examples of the same concept',
      'Incorporate regular practice and review sessions',
      'Use different modalities (visual, auditory, kinesthetic)',
    ],
    typical_behaviors: [
      'Forgets without review',
      'Improves with practice',
      'Asks for examples',
      'Needs reminders',
    ],
    improvement_tips: [
      'Use spaced repetition systems',
      'Provide varied practice',
      'Review regularly',
      'Use multiple teaching methods',
    ],
  },
  {
    category_key: 'social_learner',
    category_name: 'Social Learner',
    description: 'Learns best through interaction and collaboration',
    characteristics: [
      'Enjoys group work',
      'Learns from peers',
      'Communicative',
      'Values relationships',
    ],
    teaching_strategies: [
      'Use collaborative learning activities',
      'Encourage peer teaching',
      'Facilitate group discussions',
      'Provide opportunities for social interaction',
      'Use think-pair-share strategies',
    ],
    typical_behaviors: [
      'Seeks group activities',
      'Talks while learning',
      'Enjoys peer feedback',
      'Works well in teams',
    ],
    improvement_tips: [
      'Maximize collaborative opportunities',
      'Use peer tutoring',
      'Facilitate discussions',
      'Build learning communities',
    ],
  },
  {
    category_key: 'independent_learner',
    category_name: 'Independent Learner',
    description: 'Prefers to work alone and self-direct learning',
    characteristics: [
      'Self-motivated',
      'Prefers working alone',
      'Takes initiative',
      'Manages time well',
    ],
    teaching_strategies: [
      'Provide independent study options',
      'Allow self-paced learning',
      'Give autonomy in project choice',
      'Minimize group requirements',
      'Offer advanced reading materials',
    ],
    typical_behaviors: [
      'Works best alone',
      'Self-directed',
      'Completes work independently',
      'Prefers individual tasks',
    ],
    improvement_tips: [
      'Provide choice in activities',
      'Allow flexible pacing',
      'Encourage self-assessment',
      'Support independent projects',
    ],
  },
];

