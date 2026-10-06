import { cn } from '../../lib/utils';

const SCREEN = '#0B1120';
const EYE = '#F8FAFC';

const beaconFill = {
  idle: 'fill-chart-gold',
  listening: 'fill-danger-base',
  thinking: 'fill-chart-gold',
  happy: 'fill-chart-green',
};

const moodLabel = {
  idle: 'Asisten AI siap membantu',
  listening: 'Asisten AI sedang mendengarkan',
  thinking: 'Asisten AI sedang memproses',
  happy: 'Asisten AI selesai memproses',
};

function Eyes({ mood }) {
  if (mood === 'happy') {
    return (
      <g fill="none" stroke={EYE} strokeWidth="5" strokeLinecap="round">
        <path d="M73 81 Q82 68 91 81" />
        <path d="M109 81 Q118 68 127 81" />
      </g>
    );
  }

  if (mood === 'thinking') {
    return (
      <g className="robot-look" fill={EYE}>
        <circle cx="82" cy="76" r="7" />
        <circle cx="118" cy="76" r="7" />
      </g>
    );
  }

  if (mood === 'listening') {
    return (
      <g className="robot-part robot-blink" fill={EYE}>
        <circle cx="82" cy="77" r="10" />
        <circle cx="118" cy="77" r="10" />
      </g>
    );
  }

  return (
    <g className="robot-part robot-blink" fill={EYE}>
      <rect x="74" y="68" width="16" height="18" rx="8" />
      <rect x="110" y="68" width="16" height="18" rx="8" />
    </g>
  );
}

function Mouth({ mood }) {
  if (mood === 'happy') return <path d="M86 91 Q100 107 114 91 Z" className="fill-chart-mint" />;
  if (mood === 'listening') return <ellipse cx="100" cy="97" rx="5" ry="4" className="fill-chart-mint" />;

  if (mood === 'thinking') {
    return (
      <g className="fill-chart-mint">
        {[90, 100, 110].map((cx, index) => (
          <circle key={cx} cx={cx} cy="97" r="3" className="robot-part robot-dot" style={{ animationDelay: `${index * 160}ms` }} />
        ))}
      </g>
    );
  }

  return <path d="M90 94 Q100 101 110 94" fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-chart-mint" />;
}

function Sparkle({ x, y, delay, className }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d="M0 -8 L2 -2 L8 0 L2 2 L0 8 L-2 2 L-8 0 L-2 -2 Z"
        className={cn('robot-part robot-pop', className)}
        style={{ animationDelay: `${delay}ms` }}
      />
    </g>
  );
}

/** The assistant behind voice capture. `mood`: idle | listening | thinking | happy. */
export default function AiRobot({ mood = 'idle', size = 140, className }) {
  const isThinking = mood === 'thinking';
  const isHappy = mood === 'happy';

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role="img"
      aria-label={moodLabel[mood]}
      className={cn('ai-robot shrink-0 overflow-visible', className)}
    >
      <ellipse cx="100" cy="188" rx="42" ry="6" className="robot-part robot-shadow fill-surface-200" />

      {isHappy && (
        <>
          <Sparkle x={28} y={44} delay={0} className="fill-chart-gold" />
          <Sparkle x={174} y={56} delay={450} className="fill-chart-green" />
          <Sparkle x={158} y={18} delay={900} className="fill-primary-400" />
        </>
      )}

      <g className={isHappy ? 'robot-hop' : 'robot-float'}>
        {isThinking && (
          <g className="robot-orbit" style={{ transformOrigin: '100px 82px' }}>
            <circle cx="100" cy="6" r="4" className="fill-chart-gold" />
            <circle cx="166" cy="120" r="3" className="fill-chart-green" />
            <circle cx="34" cy="120" r="3" className="fill-primary-400" />
          </g>
        )}

        {mood === 'listening' && (
          <g fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-accent-base">
            <path d="M26 66 Q16 80 26 94" className="robot-part robot-ring" />
            <path d="M15 58 Q1 80 15 102" className="robot-part robot-ring" style={{ animationDelay: '350ms' }} />
            <path d="M174 66 Q184 80 174 94" className="robot-part robot-ring" />
            <path d="M185 58 Q199 80 185 102" className="robot-part robot-ring" style={{ animationDelay: '350ms' }} />
          </g>
        )}

        {/* Arms sit behind the torso, so only the outer half shows. */}
        <rect x="46" y="132" width="14" height="34" rx="7" transform="rotate(12 53 136)" className="fill-accent-base" />
        <g transform={isHappy ? 'rotate(-112 147 136)' : 'rotate(-12 147 136)'}>
          <rect
            x="140"
            y="132"
            width="14"
            height="34"
            rx="7"
            className={cn('fill-accent-base', isHappy && 'robot-wave')}
            style={{ transformOrigin: '147px 136px' }}
          />
        </g>

        <rect x="90" y="118" width="20" height="14" className="fill-accent-base" />
        <rect x="64" y="128" width="72" height="46" rx="18" className="fill-accent-strong" />
        <rect x="82" y="139" width="36" height="22" rx="8" fill={SCREEN} />
        <circle
          cx="100"
          cy="150"
          r="5"
          className={cn('robot-part', isThinking ? 'robot-beacon-fast' : 'robot-beacon', beaconFill[mood])}
        />

        <g className={isThinking ? 'robot-tilt' : undefined} style={{ transformOrigin: '100px 122px' }}>
          <line x1="100" y1="40" x2="100" y2="24" strokeWidth="4" strokeLinecap="round" className="stroke-accent-base" />
          <circle
            cx="100"
            cy="18"
            r="7"
            className={cn('robot-part', isThinking ? 'robot-beacon-fast' : 'robot-beacon', beaconFill[mood])}
          />
          <rect x="34" y="68" width="12" height="24" rx="6" className="fill-accent-base" />
          <rect x="154" y="68" width="12" height="24" rx="6" className="fill-accent-base" />
          <rect x="44" y="38" width="112" height="84" rx="28" className="fill-accent-strong" />
          <path d="M64 49 Q74 43 90 43" fill="none" strokeWidth="4" strokeLinecap="round" className="stroke-accent-base" />
          <rect x="56" y="52" width="88" height="56" rx="18" fill={SCREEN} />
          {isThinking && <rect x="64" y="56" width="72" height="3" rx="1.5" className="robot-scan fill-primary-400" />}
          <Eyes mood={mood} />
          <Mouth mood={mood} />
        </g>
      </g>
    </svg>
  );
}
