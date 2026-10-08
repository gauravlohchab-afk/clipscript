/**
 * DEVELOPMENT FIXTURES ONLY.
 * Sample Reels used by the mock media and mock AI providers so the full ClipScript workflow
 * can be exercised without Instagram access or a Gemini API key.
 */
export interface SampleReel {
  shortcode: string;
  title: string;
  author: string;
  duration: number;
  width: number;
  height: number;
  colors: [string, string, string];
  transcript: Array<{ start: number; end: number; text: string }>;
  onScreenText: Array<{ timestamp: number; until: number; text: string }>;
  hook: { type: string; whyItWorks: string; score: number };
  structure: Array<{ stage: string; start: number; end: number; description: string }>;
  retention: { score: number; observations: string[]; riskPoints: string[] };
  cta: { text: string; type: string; score: number };
  keyTakeaways: string[];
  summary: string;
  structureScore: number;
}

export const SAMPLE_REELS: SampleReel[] = [
  {
    shortcode: 'CSdemoHook01',
    title: '3 mistakes quietly killing your Reels reach',
    author: 'creatorlab.studio',
    duration: 24,
    width: 1080,
    height: 1920,
    colors: ['0x1a0b2e', '0x6d1b5b', '0xd9268a'],
    transcript: [
      { start: 0, end: 3, text: 'Stop scrolling. These three mistakes are quietly killing your reach.' },
      { start: 3, end: 7, text: 'Mistake one: your first frame is a talking head with zero context.' },
      { start: 7, end: 11, text: 'Put the payoff on screen in the first second so people know why to stay.' },
      { start: 11, end: 15, text: 'Mistake two: you spend ten seconds on setup before anything happens.' },
      { start: 15, end: 19, text: 'Cut straight to the tension. Context can come later.' },
      { start: 19, end: 22, text: 'Mistake three: you give people no reason to watch until the end.' },
      { start: 22, end: 24, text: 'Follow for part two, where I fix a real Reel live.' },
    ],
    onScreenText: [
      { timestamp: 0, until: 3, text: '3 MISTAKES KILLING YOUR REACH' },
      { timestamp: 3, until: 11, text: '#1 NO CONTEXT IN FRAME ONE' },
      { timestamp: 11, until: 19, text: '#2 SLOW SETUP' },
      { timestamp: 19, until: 22, text: '#3 NO PAYOFF' },
      { timestamp: 22, until: 24, text: 'FOLLOW FOR PART 2' },
    ],
    hook: {
      type: 'Pattern interrupt + numbered promise',
      whyItWorks:
        'The command "Stop scrolling" interrupts autopilot viewing, and the number three sets a clear, finite promise. Naming a fear (losing reach) makes the payoff feel personally relevant within the first two seconds.',
      score: 88,
    },
    structure: [
      { stage: 'hook', start: 0, end: 3, description: 'Pattern interrupt with a numbered list promise tied to a creator pain point.' },
      { stage: 'problem', start: 3, end: 11, description: 'Mistake one: weak first frame, followed immediately by the fix.' },
      { stage: 'insight', start: 11, end: 19, description: 'Mistake two: slow setup, reframed as "lead with tension".' },
      { stage: 'proof', start: 19, end: 22, description: 'Mistake three lands quickly, keeping the list momentum.' },
      { stage: 'cta', start: 22, end: 24, description: 'Follow CTA framed as a cliffhanger for part two.' },
    ],
    retention: {
      score: 82,
      observations: [
        'Each mistake is introduced with a numbered on-screen label, giving viewers a progress bar.',
        'Problem and fix are paired back to back, so no section ends on an unresolved idea.',
        'Cuts land roughly every 3–4 seconds, matching the pace of the spoken list.',
      ],
      riskPoints: [
        '11s: the second mistake repeats the "first seconds" idea from mistake one, which may feel redundant.',
        '19–22s: mistake three has no fix, so viewers expecting the pattern may feel short-changed.',
      ],
    },
    cta: { text: 'Follow for part two, where I fix a real Reel live.', type: 'Follow for series', score: 79 },
    keyTakeaways: [
      'Open with a command plus a number to create an instant, finite promise.',
      'Pair every problem with its fix inside the same 4–8 second beat.',
      'Use numbered on-screen labels as a visible progress bar.',
      'End on a series cliffhanger to turn viewers into followers.',
    ],
    summary:
      'A fast listicle Reel that diagnoses three reach-killing mistakes for short-form creators, pairing each with a quick fix and closing on a part-two follow CTA.',
    structureScore: 84,
  },
  {
    shortcode: 'CSdemoStory02',
    title: 'I posted a Reel every day for 30 days. Here is what happened',
    author: 'dailymaker',
    duration: 30,
    width: 1080,
    height: 1920,
    colors: ['0x0f1024', '0x2d1b69', '0x8b3fd9'],
    transcript: [
      { start: 0, end: 3, text: 'I posted a Reel every single day for thirty days. Day nineteen changed everything.' },
      { start: 3, end: 8, text: 'The first two weeks were brutal. Most videos stalled under five hundred views.' },
      { start: 8, end: 13, text: 'So I stopped guessing and studied the first three seconds of every viral Reel in my niche.' },
      { start: 13, end: 18, text: 'Every single one opened with the result before the story.' },
      { start: 18, end: 23, text: 'On day nineteen I flipped my format and that Reel hit two hundred thousand views.' },
      { start: 23, end: 27, text: 'Same camera, same niche. The only change was the order of the story.' },
      { start: 27, end: 30, text: 'Comment "hook" and I will send you my exact template.' },
    ],
    onScreenText: [
      { timestamp: 0, until: 3, text: '30 DAYS. 30 REELS.' },
      { timestamp: 3, until: 8, text: 'WEEK 1-2: UNDER 500 VIEWS' },
      { timestamp: 13, until: 18, text: 'RESULT FIRST, STORY SECOND' },
      { timestamp: 18, until: 23, text: 'DAY 19: 200K VIEWS' },
      { timestamp: 27, until: 30, text: 'COMMENT HOOK' },
    ],
    hook: {
      type: 'Challenge + curiosity gap',
      whyItWorks:
        'A concrete 30-day challenge signals effort and proof, while "day nineteen changed everything" opens a curiosity gap that can only be closed by watching to that point.',
      score: 91,
    },
    structure: [
      { stage: 'hook', start: 0, end: 3, description: 'Challenge framing with a specific turning point teased.' },
      { stage: 'problem', start: 3, end: 8, description: 'Relatable struggle: two weeks of low views.' },
      { stage: 'insight', start: 8, end: 18, description: 'Research moment that reveals the "result first" pattern.' },
      { stage: 'proof', start: 18, end: 27, description: 'Day 19 outcome with a specific number, isolating one variable.' },
      { stage: 'cta', start: 27, end: 30, description: 'Comment-keyword CTA offering a template.' },
    ],
    retention: {
      score: 87,
      observations: [
        'The day-19 tease creates an open loop that is only resolved at 18s, past the midpoint.',
        'Specific numbers (500 views, 200K views) make the story concrete and credible.',
        'The insight is stated in one short sentence, making it easy to remember and share.',
      ],
      riskPoints: [
        '3–8s: the struggle section is purely verbal; a visual of the low-view analytics would hold attention better.',
      ],
    },
    cta: { text: 'Comment "hook" and I will send you my exact template.', type: 'Comment keyword (lead magnet)', score: 90 },
    keyTakeaways: [
      'Tease the turning point in the hook ("day 19 changed everything") to create an open loop.',
      'Isolate one variable in your proof so the lesson feels transferable.',
      'Use specific numbers for both the struggle and the result.',
      'Comment-keyword CTAs drive engagement and capture leads in one step.',
    ],
    summary:
      'A personal 30-day experiment story showing how restructuring Reels to lead with the result transformed performance, closing with a comment-to-get-template CTA.',
    structureScore: 89,
  },
  {
    shortcode: 'CSdemoEdit03',
    title: 'The 5-second editing trick pros use on every Reel',
    author: 'editwithmaya',
    duration: 18,
    width: 720,
    height: 1280,
    colors: ['0x120b1f', '0x4a1550', '0xf0469b'],
    transcript: [
      { start: 0, end: 3, text: 'This five second edit is why your Reels feel amateur.' },
      { start: 3, end: 7, text: 'Pros never let a shot sit still for longer than two seconds.' },
      { start: 7, end: 11, text: 'Add a tiny punch-in zoom on every key word, like this.' },
      { start: 11, end: 15, text: 'It resets attention without a single new shot.' },
      { start: 15, end: 18, text: 'Save this so you try it on your next edit.' },
    ],
    onScreenText: [
      { timestamp: 0, until: 3, text: 'WHY YOUR REELS FEEL AMATEUR' },
      { timestamp: 7, until: 11, text: 'PUNCH-IN ON KEY WORDS' },
      { timestamp: 15, until: 18, text: 'SAVE THIS' },
    ],
    hook: {
      type: 'Callout / negative framing',
      whyItWorks:
        'Calling the viewer\'s work "amateur" triggers mild loss aversion, and the tiny time cost ("five second edit") lowers the effort barrier to keep watching.',
      score: 84,
    },
    structure: [
      { stage: 'hook', start: 0, end: 3, description: 'Direct callout that challenges the viewer\'s current editing.' },
      { stage: 'insight', start: 3, end: 7, description: 'Rule of thumb from professionals: no static shot over two seconds.' },
      { stage: 'demonstration', start: 7, end: 15, description: 'Live demonstration of punch-in zooms with the reason it works.' },
      { stage: 'cta', start: 15, end: 18, description: 'Save CTA tied to the next editing session.' },
    ],
    retention: {
      score: 78,
      observations: [
        'The demonstration happens on screen while it is explained, so viewers see the payoff immediately.',
        'Short runtime keeps completion rate high.',
      ],
      riskPoints: ['3–7s: the rule is stated without a visual example, which is the most likely drop-off point.'],
    },
    cta: { text: 'Save this so you try it on your next edit.', type: 'Save', score: 74 },
    keyTakeaways: [
      'Short, tactical Reels can win on completion rate alone.',
      'Show the technique while you explain it rather than after.',
      'Save CTAs fit utility content that viewers will want to revisit.',
    ],
    summary:
      'A short editing tutorial teaching punch-in zooms on key words as a fast way to make Reels feel more professional, ending with a save CTA.',
    structureScore: 80,
  },
];

export function findSampleReel(shortcode: string): SampleReel | undefined {
  return SAMPLE_REELS.find((sample) => sample.shortcode === shortcode);
}

/** Deterministically maps any shortcode to one of the samples. */
export function pickSampleReel(shortcode: string): SampleReel {
  const exact = findSampleReel(shortcode);
  if (exact) return exact;
  const hash = [...shortcode].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);
  return SAMPLE_REELS[hash % SAMPLE_REELS.length] as SampleReel;
}
