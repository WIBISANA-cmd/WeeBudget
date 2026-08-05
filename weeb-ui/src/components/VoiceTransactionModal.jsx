import { useState, useEffect } from 'react';
import { Mic, Square, Sparkles, AlertTriangle, Plus, Trash2, CheckCircle2, Loader2, ArrowRight, RefreshCw, Timer, Volume2, Pencil } from 'lucide-react';
import Modal from './forms/Modal';
import Button from './ui/Button';
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

const isQuotaError = (msg) => !!msg && /429|kuota|Quota/.test(msg);

export default function VoiceTransactionModal({ open, onClose, onSuccess }) {
  const { supported, listening, transcript, start, stop, reset } = useSpeechRecognition({ lang: 'id-ID' });
  const { recording, audioBlob, error: recorderError, startRecording, stopRecording, resetRecording } = useMediaRecorder();
  const { categories } = useCategoryOptions();
  const { accounts } = useAccountOptions();

  const [inputText, setInputText] = useState('');
  const [step, setStep] = useState('idle'); // 'idle' | 'parsing' | 'review' | 'saving' | 'done'
  const [drafts, setDrafts] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [budgetAlerts, setBudgetAlerts] = useState([]);
  const [savedCount, setSavedCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [heardText, setHeardText] = useState('');

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
    if (!open) {
      setStep('idle');
      setInputText('');
      setDrafts([]);
      setParseError(null);
      setBudgetAlerts([]);
      setSavedCount(0);
      setCountdown(0);
      setHeardText('');
      reset();
      resetRecording();
    }
  }, [open, reset, resetRecording]);

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
      start();
      startRecording();
    }
  };

  const handleParse = async () => {
    const textToParse = inputText.trim();
    if (!textToParse && !audioBlob) return;

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

      setDrafts(items.map((item, idx) => ({
        id: `draft-${Date.now()}-${idx}`,
        transaction_type: item.transaction_type || 'expense',
        amount: item.amount || 0,
        category_id: item.category_id || '',
        account_id: item.account_id || (accounts[0]?.value || ''),
        need_type: item.need_type || (item.transaction_type === 'income' ? '' : 'need'),
        transaction_date: item.transaction_date || new Date().toISOString().split('T')[0],
        description: item.description || '',
        confidence: item.confidence || 'medium',
      })));
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
    setDrafts((prev) => [
      ...prev,
      {
        id: `draft-${Date.now()}-${prev.length}`,
        transaction_type: 'expense',
        amount: 0,
        category_id: '',
        account_id: accounts[0]?.value || '',
        need_type: 'need',
        transaction_date: new Date().toISOString().split('T')[0],
        description: '',
        confidence: 'high',
      },
    ]);
  };

  const handleUpdateDraft = (index, field, value) => {
    setDrafts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleDeleteDraft = (index) => {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirmSave = async () => {
    if (drafts.length === 0) return;

    setStep('saving');
    setParseError(null);
    let successCounter = 0;
    const monthsToAlertCheck = new Set();

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
        successCounter++;
        if (draft.transaction_date) {
          monthsToAlertCheck.add(draft.transaction_date.substring(0, 7) + '-01');
        }
      }

      setSavedCount(successCounter);

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
    } catch (err) {
      console.error('Error saving voice transactions:', err);
      setParseError(err?.response?.data?.message || 'Beberapa transaksi gagal disimpan. Periksa kelengkapan data.');
      setStep('review');
    }
  };

  const micHint = recorderError
    || (busy && 'Bicara sekarang, teks muncul otomatis di bawah')
    || (audioBlob && !inputText.trim() && 'Rekaman siap dikirim. AI akan mentranskripsi saat diekstrak.')
    || (supported ? 'Ketuk untuk bicara, atau langsung ketik di bawah' : 'Ketuk untuk merekam, atau langsung ketik di bawah');

  // Aksi utama hidup di footer Modal (di luar area scroll) supaya tidak pernah
  // tertimpa bottom-nav / browser chrome di mobile.
  const footer = {
    idle: (
      <Button
        variant="primary"
        disabled={(!inputText.trim() && !audioBlob) || busy || countdown > 0}
        onClick={handleParse}
        className="w-full gap-2 rounded-2xl py-3.5 text-sm font-bold shadow-md bg-linear-to-r from-amber-500 to-primary-600"
      >
        {countdown > 0 ? (
          <>
            <Timer size={18} className="animate-spin text-amber-200" />
            <span>Tunggu {countdown}s</span>
          </>
        ) : (
          <>
            <Sparkles size={18} className="text-amber-200" />
            <span>Ekstrak Mutasi via AI</span>
          </>
        )}
      </Button>
    ),
    review: (
      <Button
        variant="primary"
        disabled={drafts.length === 0}
        onClick={handleConfirmSave}
        className="w-full gap-2 rounded-2xl py-3.5 text-sm font-bold shadow-md bg-linear-to-r from-success-base to-primary-600"
      >
        Simpan {drafts.length} Transaksi <ArrowRight size={16} />
      </Button>
    ),
    done: (
      <Button variant="primary" onClick={onClose} className="w-full rounded-2xl py-3.5 font-bold shadow-md">
        Selesai & Kembali ke Dashboard
      </Button>
    ),
  }[step];

  return (
    <Modal
      open={open}
      onClose={onClose}
      fullScreenOnMobile
      title="Catat dengan Suara"
      description="Sebutkan atau ketik transaksi Anda dalam kalimat biasa, AI akan mengekstrak otomatis."
      footer={footer}
    >
      <div className="space-y-5">
        {/* Error Alert */}
        {parseError && (
          <div className={cn(
            'flex items-start gap-3 rounded-2xl p-4 text-sm text-white shadow-md',
            isQuotaError(parseError) ? 'bg-amber-600' : 'bg-danger-600'
          )}>
            <AlertTriangle className="mt-0.5 shrink-0 text-white/95" size={20} />
            <div className="flex-1 space-y-1.5">
              <p className="font-semibold leading-snug">{parseError}</p>
              {isQuotaError(parseError) && (
                countdown > 0 ? (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-amber-700/90 px-3 py-1.5 text-xs font-semibold">
                    <Timer size={14} className="animate-spin text-amber-200" />
                    <span>Tunggu <strong className="font-mono text-sm text-amber-200">{countdown}s</strong></span>
                  </div>
                ) : (
                  <p className="text-xs font-medium text-amber-100">Silakan tekan tombol di bawah untuk mencoba kembali.</p>
                )
              )}
            </div>
          </div>
        )}

        {/* STEP 1: UNIFIED INPUT — mic and text are the same field */}
        {step === 'idle' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center rounded-3xl border border-border-subtle bg-linear-to-b from-surface-panel to-surface-100/50 p-5 text-center">
              <div className="relative flex h-24 w-24 items-center justify-center">
                {busy && (
                  <>
                    <span className="absolute inset-0 animate-ping rounded-full bg-danger-500/20" />
                    <span className="absolute inset-2 animate-pulse rounded-full bg-danger-500/10" />
                  </>
                )}
                <button
                  type="button"
                  onClick={handleToggleMic}
                  aria-label={busy ? 'Hentikan rekaman' : 'Mulai bicara'}
                  aria-pressed={busy}
                  className={cn(
                    'relative z-10 flex h-20 w-20 items-center justify-center rounded-full text-white transition-transform duration-200 active:scale-90',
                    busy
                      ? 'bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.7)]'
                      : 'bg-violet-600 animate-neon-pulse-purple hover:bg-violet-700'
                  )}
                >
                  {busy ? <Square size={28} fill="currentColor" /> : <Mic size={32} />}
                </button>
              </div>

              <p className={cn('mt-4 max-w-xs text-xs leading-relaxed', recorderError ? 'font-semibold text-danger-600' : 'text-text-muted')}>
                {micHint}
              </p>

              {busy && (
                <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-bold text-primary-600 animate-pulse">
                  <Volume2 size={13} /> Merekam...
                </span>
              )}
            </div>

            {/* Live transcript preview = the editable input itself */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="voice-transcript" className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
                  {busy ? 'Mendengarkan...' : 'Transkrip / Teks Transaksi'}
                </label>
                {inputText && !busy && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-text-muted">
                    <Pencil size={11} /> Bisa diedit
                  </span>
                )}
              </div>
              <textarea
                id="voice-transcript"
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder='Contoh: "Beli sarapan 25rb pakai Tunai dan bayar parkir 5 ribu"'
                className={cn(
                  'w-full rounded-2xl border bg-surface-panel p-4 text-sm text-text-title placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500/20',
                  busy ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-border-subtle focus:border-primary-500'
                )}
              />
            </div>

            {!inputText && !busy && (
              <div className="flex flex-wrap gap-2">
                {SAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInputText(prompt)}
                    className="rounded-xl border border-border-subtle bg-surface-100 px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-primary-500/30 hover:bg-primary-500/10 hover:text-primary-600"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: PARSING */}
        {step === 'parsing' && (
          <div className="flex flex-col items-center justify-center space-y-4 py-16 text-center">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-500/10 text-primary-600">
              <Loader2 className="animate-spin" size={40} />
              <Sparkles className="absolute -right-2 -top-2 animate-bounce text-amber-500" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-title">AI Sedang Bekerja...</h3>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-text-muted">
                {useAudio ? 'Mentranskripsi rekaman suara Anda, lalu mengidentifikasi nominal, kategori, dan rekening.' : 'Mengidentifikasi nominal transaksi, kategori pengeluaran, dan sumber rekening.'}
              </p>
            </div>
          </div>
        )}

        {/* STEP 3: REVIEW */}
        {step === 'review' && (
          <div className="space-y-4">
            {heardText && (
              <div className="rounded-2xl border border-primary-500/15 bg-primary-500/5 p-4 text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600">Yang AI Dengar</span>
                <p className="mt-1 text-sm font-semibold italic text-text-title">"{heardText}"</p>
              </div>
            )}

            <div className="flex items-center justify-between rounded-2xl border border-border-subtle bg-surface-100 p-3.5">
              <span className="text-xs font-bold text-text-body">
                Draf AI: <strong className="text-sm font-bold text-primary-600">{drafts.length} Transaksi</strong>
              </span>
              <button
                type="button"
                onClick={() => setStep('idle')}
                className="flex items-center gap-1 text-xs font-bold text-primary-600 hover:underline"
              >
                <RefreshCw size={13} /> Ulangi
              </button>
            </div>

            <div className="space-y-4">
              {drafts.map((draft, idx) => {
                const filteredCategories = categories.filter(
                  (c) => c.type === draft.transaction_type || c.type === 'both'
                );

                return (
                  <div key={draft.id} className="space-y-4 rounded-3xl border border-border-subtle bg-surface-panel p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-2 border-b border-border-subtle pb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-100 text-[11px] font-bold text-text-muted">
                          {idx + 1}
                        </span>
                        <div className="inline-flex rounded-xl border border-border-subtle bg-surface-100 p-0.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateDraft(idx, 'transaction_type', 'expense')}
                            className={cn(
                              'rounded-lg px-3 py-1 text-[11px] font-bold transition-all',
                              draft.transaction_type === 'expense' ? 'bg-danger-500 text-white shadow-sm' : 'text-text-muted'
                            )}
                          >
                            Keluar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateDraft(idx, 'transaction_type', 'income')}
                            className={cn(
                              'rounded-lg px-3 py-1 text-[11px] font-bold transition-all',
                              draft.transaction_type === 'income' ? 'bg-success-base text-white shadow-sm' : 'text-text-muted'
                            )}
                          >
                            Masuk
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteDraft(idx)}
                        className="rounded-xl p-2 text-text-muted hover:bg-danger-50 hover:text-danger-600"
                        title="Hapus draf ini"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-text-muted">Nominal (Rupiah)</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-text-muted">Rp</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          value={draft.amount}
                          onChange={(e) => handleUpdateDraft(idx, 'amount', e.target.value)}
                          className="w-full rounded-2xl border border-border-subtle bg-surface-panel py-3 pl-10 pr-3.5 text-base font-bold text-text-title focus:border-primary-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-text-muted">Deskripsi / Keterangan</label>
                      <input
                        type="text"
                        value={draft.description}
                        onChange={(e) => handleUpdateDraft(idx, 'description', e.target.value)}
                        className="w-full rounded-2xl border border-border-subtle bg-surface-panel px-3.5 py-3 text-sm text-text-title focus:border-primary-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-text-muted">
                          {draft.transaction_type === 'income' ? 'Rekening Penerima' : 'Rekening Sumber'}
                        </label>
                        <select
                          value={draft.account_id || ''}
                          onChange={(e) => handleUpdateDraft(idx, 'account_id', e.target.value)}
                          className="w-full rounded-2xl border border-border-subtle bg-surface-panel px-3.5 py-3 text-sm text-text-title focus:border-primary-500 focus:outline-none"
                        >
                          <option value="">-- Pilih Rekening --</option>
                          {accounts.map((acc) => (
                            <option key={acc.value} value={acc.value}>{acc.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-text-muted">Kategori</label>
                        <select
                          value={draft.category_id || ''}
                          onChange={(e) => handleUpdateDraft(idx, 'category_id', e.target.value)}
                          className="w-full rounded-2xl border border-border-subtle bg-surface-panel px-3.5 py-3 text-sm text-text-title focus:border-primary-500 focus:outline-none"
                        >
                          <option value="">-- Pilih Kategori --</option>
                          {filteredCategories.map((cat) => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-text-muted">Tanggal</label>
                        <input
                          type="date"
                          value={draft.transaction_date}
                          onChange={(e) => handleUpdateDraft(idx, 'transaction_date', e.target.value)}
                          className="w-full rounded-2xl border border-border-subtle bg-surface-panel px-3 py-2.5 text-xs text-text-title focus:border-primary-500 focus:outline-none"
                        />
                      </div>

                      {draft.transaction_type === 'expense' && (
                        <div>
                          <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-text-muted">Klasifikasi</label>
                          <select
                            value={draft.need_type || 'need'}
                            onChange={(e) => handleUpdateDraft(idx, 'need_type', e.target.value)}
                            className="w-full rounded-2xl border border-border-subtle bg-surface-panel px-3 py-2.5 text-xs text-text-title focus:border-primary-500 focus:outline-none"
                          >
                            <option value="need">Kebutuhan (Need)</option>
                            <option value="want">Keinginan (Want)</option>
                            <option value="saving">Tabungan (Saving)</option>
                            <option value="debt">Cicilan (Debt)</option>
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleAddDraftCard}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border-subtle bg-surface-100/50 py-3 text-xs font-bold text-text-muted transition-colors hover:bg-surface-100"
            >
              <Plus size={15} /> Tambah Transaksi Manual
            </button>
          </div>
        )}

        {/* STEP 4: SAVING */}
        {step === 'saving' && (
          <div className="flex flex-col items-center justify-center space-y-4 py-16 text-center">
            <Loader2 className="animate-spin text-primary-600" size={44} />
            <div>
              <h3 className="text-lg font-bold text-text-title">Menyimpan Keuangan...</h3>
              <p className="mt-1 text-xs text-text-muted">Memperbarui saldo rekening dan mencatat data mutasi.</p>
            </div>
          </div>
        )}

        {/* STEP 5: DONE */}
        {step === 'done' && (
          <div className="space-y-6 py-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success-50 text-success-base dark:bg-success-950/40">
              <CheckCircle2 size={48} />
            </div>

            <div>
              <h3 className="text-xl font-bold text-text-title">{savedCount} Transaksi Disimpan!</h3>
              <p className="mt-1.5 text-xs text-text-muted">
                Daftar mutasi telah diperbarui dan saldo rekening telah disesuaikan secara otomatis.
              </p>
            </div>

            {budgetAlerts.length > 0 && (
              <div className="space-y-3 rounded-3xl border border-amber-200 bg-amber-500/5 p-4 text-left">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200">
                  <AlertTriangle size={15} className="shrink-0 text-amber-600" />
                  Sisa Budget Bulanan Menipis
                </div>
                <div className="space-y-2">
                  {budgetAlerts.map((alert) => (
                    <div key={alert.category_id} className="flex flex-col space-y-2 rounded-2xl border border-amber-200/50 bg-surface-panel/80 p-3 text-xs text-text-body">
                      <div className="flex items-start justify-between">
                        <span className="font-semibold text-text-title">{alert.category_name}</span>
                        <span className={cn(
                          'rounded-md px-2 py-0.5 text-[9px] font-bold uppercase',
                          alert.status === 'exceeded' ? 'bg-danger-500 text-white' : 'bg-amber-500 text-white'
                        )}>
                          {alert.usage_percent}% {alert.status === 'exceeded' ? 'Melebihi' : 'Hampir Habis'}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-200">
                        <div
                          className={cn('h-full rounded-full', alert.status === 'exceeded' ? 'bg-danger-500' : 'bg-amber-500')}
                          style={{ width: `${Math.min(alert.usage_percent, 100)}%` }}
                        />
                      </div>
                      <span className="block text-[10px] text-text-muted">
                        Terpakai: {formatCurrency(alert.spent_amount)} dari {formatCurrency(alert.allocated_amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
