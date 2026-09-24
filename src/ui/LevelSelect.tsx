import { useId, useState, type FormEvent } from 'react';
import { LEVELS, isLevelUnlocked, type Level } from '../game/levels';
import type { LevelRecord } from '../game/records';
import { formatSeed, parseSeed } from '../game/seedCode';
import { gameStore } from '../game/store';
import { formatTime } from '../game/timer';
import { useGame } from '../hooks/useGame';
import { LockIcon, StarRow } from './icons';

const MAX_CODE = formatSeed(0xffffffff);

/** The menu: the five levels (each opens once the one before it is beaten) and Endless mode. */
export function LevelSelect() {
  const phase = useGame((state) => state.phase);
  const records = useGame((state) => state.records);

  if (phase !== 'menu') return null;

  const unlocked = LEVELS.map((level) => isLevelUnlocked(level.id, records));
  // Focus the level to play next: the first open one not beaten yet, else the last open one.
  const firstNew = LEVELS.findIndex((level, i) => unlocked[i] && !records.levels[level.id]);
  const suggested = firstNew >= 0 ? firstNew : unlocked.lastIndexOf(true);

  return (
    <div className="overlay overlay--menu">
      <section className="menu" aria-labelledby="menu-title">
        <header className="menu-header">
          <h1 id="menu-title" className="menu-title">
            Tumble Run
          </h1>
          <p className="menu-subtitle">Roll to the trophy. Grab the coins. Beat your best.</p>
        </header>

        <h2 className="menu-heading">Levels</h2>
        <ol className="levels">
          {LEVELS.map((level, i) => (
            <LevelCard
              key={level.id}
              level={level}
              number={i + 1}
              record={records.levels[level.id]}
              unlocked={unlocked[i] === true}
              suggested={i === suggested}
            />
          ))}
        </ol>

        <EndlessPanel best={records.endless} />
      </section>
    </div>
  );
}

interface LevelCardProps {
  level: Level;
  number: number;
  record: LevelRecord | undefined;
  unlocked: boolean;
  suggested: boolean;
}

function LevelCard({ level, number, record, unlocked, suggested }: LevelCardProps) {
  const className = ['level', unlocked ? '' : 'level--locked', suggested ? 'level--next' : '']
    .filter(Boolean)
    .join(' ');
  const summary = !unlocked
    ? `locked, beat level ${number - 1} to open it`
    : record
      ? `best ${formatTime(record.bestTimeMs)}, ${record.bestStars} of 3 stars`
      : 'not beaten yet';

  return (
    <li>
      <button
        type="button"
        className={className}
        disabled={!unlocked}
        autoFocus={suggested}
        aria-label={`Level ${number}, ${level.name}: ${summary}`}
        onClick={() => gameStore.getState().selectLevel(level.id)}
      >
        <span className="level-number">{number}</span>
        <span className="level-name">{level.name}</span>
        {unlocked ? (
          <>
            <StarRow count={record?.bestStars ?? 0} />
            <span className="level-time">
              {record ? formatTime(record.bestTimeMs) : 'No best yet'}
            </span>
          </>
        ) : (
          <span className="level-lock">
            <LockIcon />
            Beat level {number - 1}
          </span>
        )}
      </button>
    </li>
  );
}

/** Endless: a random course, or the course for a typed seed code. */
function EndlessPanel({ best }: { best: Partial<Record<string, number>> }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const helpId = useId();

  const typed = parseSeed(code);
  const typedCode = typed === null ? null : formatSeed(typed);
  const typedBest = typedCode === null ? undefined : best[typedCode];
  const help =
    error ??
    (typedCode !== null && typedBest !== undefined
      ? `Your best on #${typedCode}: ${formatTime(typedBest)}`
      : 'Codes are shown during a run and on the end screen.');

  const play = (event: FormEvent) => {
    event.preventDefault();
    const seed = parseSeed(code);
    if (seed === null) {
      setError(
        code.trim() === ''
          ? 'Type a seed code first.'
          : `"${code.trim()}" isn't a seed code: use 1 to 7 letters or digits, up to ${MAX_CODE}.`,
      );
      return;
    }
    gameStore.getState().playEndless(seed);
  };

  return (
    <section className="endless" aria-labelledby="endless-title">
      <div className="endless-intro">
        <h2 id="endless-title" className="menu-heading">
          Endless
        </h2>
        <p className="endless-text">A generated course. Its seed code replays it exactly.</p>
      </div>
      <button
        type="button"
        className="button endless-random"
        onClick={() => gameStore.getState().playEndless()}
      >
        Random course
      </button>

      <form className="seed-form" onSubmit={play} noValidate>
        <label htmlFor={inputId} className="seed-label">
          Seed code
        </label>
        <div className="seed-row">
          <input
            id={inputId}
            className="seed-input"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setError(null);
            }}
            placeholder="e.g. 1PKQ3XE"
            maxLength={12}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            enterKeyHint="go"
            aria-invalid={error !== null}
            aria-describedby={helpId}
          />
          <button type="submit" className="button button--soft">
            Play
          </button>
        </div>
        <p
          id={helpId}
          className={error ? 'seed-help seed-help--error' : 'seed-help'}
          role={error ? 'alert' : undefined}
        >
          {help}
        </p>
      </form>
    </section>
  );
}
