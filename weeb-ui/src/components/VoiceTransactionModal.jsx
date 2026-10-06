import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Mic, Square, Sparkles, AlertTriangle, Plus, Check, Loader2, ArrowRight, RotateCcw, Timer, Quote, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import Modal from './forms/Modal';
import Button from './ui/Button';
import AiRobot from './voice/AiRobot';
import DraftCard from './voice/DraftCard';
import { getDraftIssues } from './voice/draftIssues';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useMediaRecorder } from '../hooks/useMediaRecorder';
import { useCategoryOptions } from '../hooks/useCategoryOptions';
import { useAccountOptions } from '../hooks/useAccountOptions';
import { voiceApi } from '../api/voice';
import { resourcesApi } from '../api/resources';
import { apiGet } from '../api/http';
import { formatCurrency } from '../lib/formatters';
import { cn } from '../lib/utils';

const SAMPLE_PROMPTS = [
  'Beli kopi 35rb pakai BCA',
  'Bonus 1.5 juta masuk Kantong Utama',
  'Belanja mingguan 150 ribu potong Cash',
];

const STEPPER = ['Ucapkan', 'Periksa', 'Selesai'];
const STEPPER_INDEX = { idle: 0, parsing: 0, review: 1, saving: 1, done: 2 };

// The API answers in one go, so these only pace the wait; the last one holds until the reply lands.
const TEXT_STAGES = ['Mengenali nominal dan jenis transaksi', 'Mencocokkan kategori dan rekening', 'Menyusun draf transaksi'];
const AUDIO_STAGES = ['Mengubah suara menjadi teks', ...TEXT_STAGES];
const STAGE_INTERVAL_MS = 1700;

const isQuotaError = (msg) => !!msg && /429|kuota|Quota/.test(msg);
const today = () => dayjs().format('YYYY-MM-DD');
const formatElapsed = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const sumAmounts = (items, type) => items
  .filter((item) => item.transaction_type === type)
  .reduce((total, item) => total + Number(item.amount || 0), 0);

function Stepper({ current }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPPER.map((label, index) => {
        const isDone = index < current;
        const isActive = index === current;

        return (
          <li key={label} className={cn('flex items-center gap-2', index < STEPPER.length - 1 && 'flex-1')} aria-current={isActive ? 'step' : undefined}>
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors duration-200',
                isActive && 'bg-accent-strong text-white',
                isDone && 'bg-accent-soft text-accent-base',
                !isActive && !isDone && 'bg-surface-100 text-text-muted',
              )}
            >
              {isDone ? <Check size={13} strokeWidth={3} /> : index + 1}
            </span>
            <span className={cn('text-xs font-semibold', isActive ? 'text-text-title' : 'text-text-muted')}>{label}</span>
            {index < STEPPER.length - 1 && (
              <span className={cn('h-px flex-1 transition-colors duration-200', isDone ? 'bg-accent-base' : 'bg-border-subtle')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function VoiceBars({ delayOffset = 0 }) {
  return (
    <span className="flex h-8 items-center gap-1" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          className="voice-bar h-full w-1 rounded-full bg-danger-base"
          style={{ animationDelay: `${((bar + delayOffset) % 5) * 110}ms` }}
        />
      ))}
    </span>
  );
}

function TotalTile({ label, amount, tone }) {
  const Icon = tone === 'income' ? ArrowDownLeft : ArrowUpRight;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface-100 p-3.5">
      <span
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          tone === 'income' ? 'bg-success-soft text-success-base' : 'bg-danger-soft text-danger-base',
        )}
      >
        <Icon size={18} />
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-text-muted">{label}</span>
        <span className="block truncate font-outfit text-base font-semibold text-text-title">{formatCurrency(amount)}</span>
      </span>
    </div>
  );
}

export default function VoiceTransactionModal({ open, onClose, onSuccess }) {
  const { supported, listening, transcript, start, stop, reset } = useSpeechRecognition({ lang: 'id-ID' });
  const { recording, audioBlob, error: recorderError, startRecording, stopRecording, resetRecording } = useMediaRecorder();
  const { categories } = useCategoryOptions();
  const { accounts } = useAccountOptions();

  const [inputText, setInputText] = useState('');
  const [step, setStep] = useState('idle'); // 'idle' | 'parsing' | 'review' | 'saving' | 'done'
  const [drafts, setDrafts] = useState([]);
  const [openIds, setOpenIds] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [budgetAlerts, setBudgetAlerts] = useState([]);
  const [savedItems, setSavedItems] = useState([]);
  const [saveProgress, setSaveProgress] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [heardText, setHeardText] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [stages, setStages] = useState(TEXT_STAGES);
  const [stageIndex, setStageIndex] = useState(0);

  const busy = listening || recording;
  // Audio wins unless the user hand-edited the box: ElevenLabs beats the browser's live transcript.
  const useAudio = !!audioBlob && (!inputText.trim() || inputText === transcript);

  // Live transcript streams straight into the editable box — one input, no tabs.
  useEffect(() => {
    if (transcript) setInputText(transcript);
  }, [transcript]);

  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => setCountdown((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  useEffect(() => {
    if (!busy) return;
    const interval = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [busy]);

  useEffect(() => {
    if (step !== 'parsing') return;
    const interval = setInterval(() => setStageIndex((prev) => Math.min(prev + 1, stages.length - 1)), STAGE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [step, stages.length]);

  const resetAll = useCallback(() => {
    setStep('idle');
    setInputText('');
    setDrafts([]);
    setOpenIds([]);
    setParseError(null);
    setBudgetAlerts([]);
    setSavedItems([]);
    setSaveProgress(0);
    setCountdown(0);
    setHeardText('');
    setElapsed(0);
    reset();
    resetRecording();
  }, [reset, resetRecording]);

  useEffect(() => {
    if (!open) resetAll();
  }, [open, resetAll]);

  const handleToggleMic = () => {
    if (busy) {
      stop();
      stopRecording();
    } else {
      reset();
      resetRecording();
      setInputText('');
      setHeardText('');
      setParseError(null);
      setElapsed(0);
      start();
      startRecording();
    }
  };

  const handleParse = async () => {
    const textToParse = inputText.trim();
    if (!textToParse && !audioBlob) return;

    setStages(useAudio ? AUDIO_STAGES : TEXT_STAGES);
    setStageIndex(0);
    setStep('parsing');
    setParseError(null);

    try {
      let response;
      if (useAudio) {
        response = await voiceApi.transcribeAudio(audioBlob);
        const raw = response?.data?.raw_transcript;
        if (raw) {
          setInputText(raw);
          setHeardText(raw);
        }
      } else {
        response = await voiceApi.parse(textToParse);
        setHeardText(textToParse);
      }

      const items = response?.data?.drafts || [];
      if (items.length === 0) {
        setParseError('AI tidak menemukan transaksi dalam kalimat tersebut. Coba gunakan frasa lain.');
        setStep('idle');
        return;
      }

      const nextDrafts = items.map((item, idx) => ({
        id: `draft-${Date.now()}-${idx}`,
        transaction_type: item.transaction_type || 'expense',
        amount: Number(item.amount) || 0,
        category_id: item.category_id || '',
        account_id: item.account_id || (accounts[0]?.value || ''),
        need_type: item.need_type || (item.transaction_type === 'income' ? '' : 'need'),
        transaction_date: item.transaction_date || today(),
        description: item.description || '',
        confidence: item.confidence || 'medium',
      }));

      setDrafts(nextDrafts);
      // Only the drafts that need a decision start unfolded; the rest read as a tidy list.
      setOpenIds(nextDrafts.filter((draft) => {
        const { blocking, advisory } = getDraftIssues(draft);
        return blocking.length + advisory.length > 0;
      }).map((draft) => draft.id));
      setStep('review');
    } catch (err) {
      console.error('Failed to parse voice transaction:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Gagal memproses suara/kalimat. Pastikan koneksi & API Key sudah benar.';
      setParseError(errMsg);
      if (err?.response?.status === 429 || isQuotaError(errMsg)) setCountdown(30);
      setStep('idle');
    }
  };

  const handleAddDraftCard = () => {
    const id = `draft-${Date.now()}-${drafts.length}`;
    setDrafts((prev) => [
      ...prev,
      {
        id,
        transaction_type: 'expense',
        amount: 0,
        category_id: '',
        account_id: accounts[0]?.value || '',
        need_type: 'need',
        transaction_date: today(),
        description: '',
        confidence: 'high',
      },
    ]);
    setOpenIds((prev) => [...prev, id]);
  };

  const handleUpdateDraft = (id, field, value) => {
    const findCategory = (categoryId) => categories.find((category) => String(category.value) === String(categoryId));

    setDrafts((prev) => prev.map((draft) => {
      if (draft.id !== id) return draft;
      const next = { ...draft, [field]: value };

      if (field === 'transaction_type' && value !== draft.transaction_type) {
        const category = findCategory(draft.category_id);
        if (category && category.type !== value && category.type !== 'both') next.category_id = '';
        next.need_type = value === 'income' ? '' : draft.need_type || 'need';
      }

      if (field === 'category_id' && next.transaction_type !== 'income') {
        next.need_type = findCategory(value)?.needType || next.need_type;
      }

      return next;
    }));
  };

  const handleDeleteDraft = (id) => {
    setDrafts((prev) => prev.filter((draft) => draft.id !== id));
  };

  const handleToggleDraft = (id) => {
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((openId) => openId !== id) : [...prev, id]));
  };

  const handleConfirmSave = async () => {
    if (drafts.length === 0) return;

    setStep('saving');
    setSaveProgress(0);
    setParseError(null);
    const saved = [];

    try {
      for (const draft of drafts) {
        await resourcesApi.create('/transactions', {
          transaction_type: draft.transaction_type,
          amount: Number(draft.amount),
          category_id: draft.category_id || null,
          account_id: draft.account_id || null,
          need_type: draft.transaction_type === 'income' ? null : draft.need_type || 'need',
          transaction_date: draft.transaction_date,
          description: draft.description,
        });
        saved.push(draft);
        setSaveProgress(saved.length);
      }
    } catch (err) {
      console.error('Error saving voice transactions:', err);
      const message = err?.response?.data?.message || 'Transaksi gagal disimpan. Periksa kelengkapan data.';
      // What already went through leaves the list, so trying again cannot record it twice.
      setDrafts((prev) => prev.filter((draft) => !saved.includes(draft)));
      setSavedItems((prev) => [...prev, ...saved]);
      setParseError(saved.length > 0 ? `${saved.length} transaksi sudah tersimpan, sisanya gagal: ${message}` : message);
      setStep('review');
      return;
    }

    const allSaved = [...savedItems, ...saved];
    setSavedItems(allSaved);

    const monthsToAlertCheck = new Set(allSaved.map((item) => `${item.transaction_date.substring(0, 7)}-01`));
    const alertsCollected = [];
    for (const monthStr of monthsToAlertCheck) {
      try {
        const res = await apiGet('/budget-alerts', { month: monthStr });
        if (Array.isArray(res?.data?.alerts)) alertsCollected.push(...res.data.alerts);
      } catch {
        // ignore budget alert fetch error silently
      }
    }
    setBudgetAlerts(alertsCollected);
    setStep('done');

    if (onSuccess) onSuccess();
  };

  const heroTitle = busy
    ? 'Sedang mendengarkan…'
    : audioBlob && !inputText.trim()
      ? 'Rekaman siap diproses'
      : 'Ceritakan transaksi Anda';

  const micHint = recorderError
    || (busy && 'Bicara dengan kalimat biasa. Ketuk tombol lagi jika sudah selesai.')
    || (audioBlob && !inputText.trim() && 'AI akan mengubah rekaman menjadi teks saat diproses.')
    || (supported ? 'Ketuk mikrofon untuk bicara, atau ketik langsung di bawah.' : 'Ketuk mikrofon untuk merekam, atau ketik langsung di bawah.');

  const blockedCount = drafts.filter((draft) => getDraftIssues(draft).blocking.length > 0).length;
  const expenseTotal = sumAmounts(drafts, 'expense');
  const incomeTotal = sumAmounts(drafts, 'income');
  const quotaError = isQuotaError(parseError);

  // Aksi utama hidup di footer Modal (di luar area scroll) supaya tidak pernah
  // tertimpa bottom-nav / browser chrome di mobile.
  const footer = {
    idle: (
      <Button
        variant="accent"
        size="lg"
        disabled={(!inputText.trim() && !audioBlob) || busy || countdown > 0}
        onClick={handleParse}
        className="w-full gap-2"
      >
        {countdown > 0 ? (
          <>
            <Timer size={18} />
            Tunggu {countdown} detik
          </>
        ) : (
          <>
            <Sparkles size={18} />
            Proses dengan AI
          </>
        )}
      </Button>
    ),
    review: (
      <div className="space-y-2">
        {blockedCount > 0 && (
          <p className="text-center text-xs font-medium text-danger-base">
            Lengkapi {blockedCount} transaksi bertanda merah sebelum menyimpan.
          </p>
        )}
        <Button
          size="lg"
          disabled={drafts.length === 0 || blockedCount > 0}
          onClick={handleConfirmSave}
          className="w-full gap-2"
        >
          Simpan {drafts.length} transaksi
          <ArrowRight size={18} />
        </Button>
      </div>
    ),
    done: (
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" size="lg" onClick={resetAll} className="gap-2">
          <Mic size={18} />
          Catat lagi
        </Button>
        <Button size="lg" onClick={onClose}>Selesai</Button>
      </div>
    ),
  }[step];

  return (
    <Modal
      open={open}
      onClose={onClose}
      fullScreenOnMobile
      title="Catat via Suara AI"
      description="Ucapkan atau ketik transaksi dengan kalimat biasa, AI yang menyusun datanya."
      footer={footer}
    >
      <div className="space-y-5">
        <Stepper current={STEPPER_INDEX[step]} />

        {parseError && (
          <div
            role="alert"
            className={cn(
              'flex items-start gap-3 rounded-2xl border p-3.5 text-sm',
              quotaError ? 'border-warning-line bg-warning-soft' : 'border-danger-line bg-danger-soft',
            )}
          >
            <AlertTriangle size={18} className={cn('mt-0.5 shrink-0', quotaError ? 'text-warning-base' : 'text-danger-base')} />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-medium leading-snug text-text-title">{parseError}</p>
              {quotaError && (
                <p className="text-xs text-text-body">
                  {countdown > 0 ? `Bisa dicoba lagi dalam ${countdown} detik.` : 'Silakan coba proses kembali.'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* STEP 1: UNIFIED INPUT — mic and text are the same field */}
        {step === 'idle' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center rounded-2xl border border-border-subtle bg-surface-100 px-4 pb-5 pt-3 text-center">
              <AiRobot mood={busy ? 'listening' : 'idle'} size={132} />
              <h3 className="mt-1 text-base font-semibold text-text-title" aria-live="polite">{heroTitle}</h3>
              <p className={cn('mt-1 max-w-xs text-sm leading-relaxed', recorderError ? 'font-medium text-danger-base' : 'text-text-muted')}>
                {micHint}
              </p>

              <div className="mt-4 flex items-center gap-4">
                {busy && <VoiceBars />}
                <button
                  type="button"
                  onClick={handleToggleMic}
                  aria-label={busy ? 'Hentikan rekaman' : 'Mulai bicara'}
                  aria-pressed={busy}
                  className={cn(
                    'flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-white transition-[background-color,transform] duration-200 active:scale-95',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-100',
                    busy ? 'bg-danger-base dark:text-slate-950' : 'bg-accent-strong hover:bg-violet-800',
                  )}
                >
                  {busy ? <Square size={22} fill="currentColor" /> : <Mic size={26} />}
                </button>
                {busy && <VoiceBars delayOffset={2} />}
              </div>

              {busy && (
                <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-danger-soft px-3 py-1 text-xs font-semibold text-danger-base">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger-base" />
                  Merekam {formatElapsed(elapsed)}
                </span>
              )}
            </div>

            {/* Live transcript preview = the editable input itself */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="voice-transcript" className="text-sm font-medium text-text-body">
                  {busy ? 'Transkrip langsung' : 'Teks transaksi'}
                </label>
                {inputText && !busy && (
                  <button
                    type="button"
                    onClick={() => setInputText('')}
                    className="text-xs font-semibold text-primary-600 hover:underline"
                  >
                    Hapus teks
                  </button>
                )}
              </div>
              <textarea
                id="voice-transcript"
                rows={3}
                maxLength={500}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder='Contoh: "Beli sarapan 25rb pakai Tunai dan bayar parkir 5 ribu"'
                className={cn(
                  'w-full resize-none rounded-xl border bg-surface-panel px-3.5 py-3 text-sm leading-relaxed text-text-title transition-colors placeholder:text-text-muted',
                  'focus-visible:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong',
                  busy ? 'border-accent-base' : 'border-border-subtle',
                )}
              />
            </div>

            {!inputText && !busy && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-text-muted">Coba salah satu contoh</p>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setInputText(prompt)}
                      className="rounded-full border border-border-subtle bg-surface-panel px-3 py-1.5 text-xs font-medium text-text-body transition-colors duration-150 hover:border-border-strong hover:bg-primary-soft hover:text-primary-600"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: PARSING */}
        {step === 'parsing' && (
          <div className="flex flex-col items-center py-4 text-center" role="status" aria-live="polite">
            <AiRobot mood="thinking" size={176} />
            <h3 className="mt-2 text-lg font-semibold text-text-title">AI sedang memproses</h3>
            <p className="mt-1 text-sm text-text-muted">Biasanya hanya butuh beberapa detik.</p>

            <div className="mt-4 h-1.5 w-44 overflow-hidden rounded-full bg-surface-200">
              <span className="progress-slide block h-full w-2/5 rounded-full bg-accent-base" />
            </div>

            <ul className="mt-5 w-full max-w-xs space-y-2.5 text-left">
              {stages.map((label, index) => {
                const isDone = index < stageIndex;
                const isActive = index === stageIndex;

                return (
                  <li key={label} className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
                        isDone && 'bg-success-soft text-success-base',
                        isActive && 'text-accent-base',
                        !isDone && !isActive && 'text-text-muted',
                      )}
                    >
                      {isDone && <Check size={12} strokeWidth={3} />}
                      {isActive && <Loader2 size={16} className="animate-spin" />}
                      {!isDone && !isActive && <span className="h-1.5 w-1.5 rounded-full bg-surface-300" />}
                    </span>
                    <span className={cn('text-sm', isActive ? 'font-medium text-text-title' : 'text-text-muted')}>{label}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* STEP 3: REVIEW */}
        {step === 'review' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-text-title">{drafts.length} transaksi ditemukan</h3>
                <p className="text-xs text-text-muted">Ketuk transaksi untuk mengubah detailnya.</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep('idle')} className="shrink-0 gap-1.5">
                <RotateCcw size={14} />
                Ulangi
              </Button>
            </div>

            {heardText && (
              <figure className="flex gap-2.5 rounded-2xl bg-accent-soft p-3.5">
                <Quote size={16} className="mt-0.5 shrink-0 text-accent-base" />
                <div className="min-w-0">
                  <figcaption className="text-xs font-semibold text-accent-base">Yang AI dengar</figcaption>
                  <blockquote className="mt-0.5 text-sm leading-relaxed text-text-title">{heardText}</blockquote>
                </div>
              </figure>
            )}

            {drafts.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <TotalTile label="Pengeluaran" amount={expenseTotal} tone="expense" />
                <TotalTile label="Pemasukan" amount={incomeTotal} tone="income" />
              </div>
            )}

            <div className="stagger space-y-3">
              {drafts.map((draft, idx) => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  index={idx}
                  isOpen={openIds.includes(draft.id)}
                  onToggle={() => handleToggleDraft(draft.id)}
                  onChange={(field, value) => handleUpdateDraft(draft.id, field, value)}
                  onDelete={() => handleDeleteDraft(draft.id)}
                  categories={categories}
                  accounts={accounts}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddDraftCard}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong text-sm font-medium text-primary-600 transition-colors duration-150 hover:bg-primary-soft"
            >
              <Plus size={16} />
              Tambah transaksi manual
            </button>
          </div>
        )}

        {/* STEP 4: SAVING */}
        {step === 'saving' && (
          <div className="flex flex-col items-center py-4 text-center" role="status" aria-live="polite">
            <AiRobot mood="thinking" size={176} />
            <h3 className="mt-2 text-lg font-semibold text-text-title">Menyimpan transaksi</h3>
            <p className="mt-1 text-sm text-text-muted">
              {saveProgress} dari {drafts.length} tersimpan, saldo rekening ikut diperbarui.
            </p>
            <div className="mt-4 h-1.5 w-44 overflow-hidden rounded-full bg-surface-200">
              <span
                className="block h-full rounded-full bg-accent-base transition-[width] duration-300"
                style={{ width: `${drafts.length ? (saveProgress / drafts.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* STEP 5: DONE */}
        {step === 'done' && (
          <div className="space-y-5">
            <div className="flex flex-col items-center text-center">
              <AiRobot mood="happy" size={156} />
              <h3 className="mt-2 text-lg font-semibold text-text-title">{savedItems.length} transaksi tersimpan</h3>
              <p className="mt-1 max-w-xs text-sm text-text-muted">
                Daftar mutasi dan saldo rekening sudah diperbarui otomatis.
              </p>
            </div>

            <ul className="divide-y divide-border-subtle rounded-2xl border border-border-subtle">
              {savedItems.map((item, idx) => {
                const isIncome = item.transaction_type === 'income';
                const category = categories.find((option) => String(option.value) === String(item.category_id));

                return (
                  <li key={item.id} className="flex items-center gap-3 p-3.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-soft text-success-base">
                      <Check size={16} strokeWidth={2.5} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text-title">{item.description || `Transaksi ${idx + 1}`}</span>
                      <span className="block truncate text-xs text-text-muted">{category?.label || 'Tanpa kategori'}</span>
                    </span>
                    <span className={cn('shrink-0 font-outfit text-sm font-semibold', isIncome ? 'text-success-base' : 'text-danger-base')}>
                      {isIncome ? '+' : '-'}{formatCurrency(item.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>

            {budgetAlerts.length > 0 && (
              <div className="space-y-3 rounded-2xl border border-warning-line bg-warning-soft p-3.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-text-title">
                  <AlertTriangle size={16} className="shrink-0 text-warning-base" />
                  Sisa budget bulanan menipis
                </div>
                <div className="space-y-2">
                  {budgetAlerts.map((alert) => {
                    const exceeded = alert.status === 'exceeded';

                    return (
                      <div key={alert.category_id} className="space-y-2 rounded-xl border border-warning-line bg-surface-panel p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate text-sm font-medium text-text-title">{alert.category_name}</span>
                          <span
                            className={cn(
                              'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                              exceeded ? 'bg-danger-soft text-danger-base' : 'bg-warning-soft text-warning-base',
                            )}
                          >
                            {alert.usage_percent}% · {exceeded ? 'Melebihi' : 'Hampir habis'}
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-200">
                          <div
                            className={cn('grow-x h-full rounded-full', exceeded ? 'bg-danger-base' : 'bg-warning-base')}
                            style={{ width: `${Math.min(alert.usage_percent, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-text-muted">
                          Terpakai {formatCurrency(alert.spent_amount)} dari {formatCurrency(alert.allocated_amount)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
