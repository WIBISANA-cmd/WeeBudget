import { useState, useEffect } from 'react';
import { Mic, MicOff, Sparkles, AlertTriangle, Plus, Trash2, CheckCircle2, Loader2, ArrowRight, RefreshCw, Timer, Volume2 } from 'lucide-react';
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

export default function VoiceTransactionModal({ open, onClose, onSuccess }) {
  const { supported, listening, transcript, setTranscript, start, stop, reset } = useSpeechRecognition({ lang: 'id-ID' });
  const { recording, audioBlob, startRecording, stopRecording, resetRecording } = useMediaRecorder();
  const { categories } = useCategoryOptions();
  const { accounts } = useAccountOptions();

  const [inputText, setInputText] = useState('');
  const [step, setStep] = useState('idle'); // 'idle' | 'listening' | 'parsing' | 'review' | 'saving' | 'done'
  const [drafts, setDrafts] = useState([]);
  const [parseError, setParseError] = useState(null);
  const [budgetAlerts, setBudgetAlerts] = useState([]);
  const [savedCount, setSavedCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [activeInputMode, setActiveInputMode] = useState('voice'); // 'voice' | 'text'

  // Sync speech transcript into input text
  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setStep('idle');
      setInputText('');
      setDrafts([]);
      setParseError(null);
      setBudgetAlerts([]);
      setSavedCount(0);
      setCountdown(0);
      setActiveInputMode('voice');
      reset();
      resetRecording();
    }
  }, [open, reset, resetRecording]);

  const handleToggleMic = () => {
    if (listening || recording) {
      stop();
      stopRecording();
      setStep('idle');
    } else {
      reset();
      resetRecording();
      setInputText('');
      start();
      startRecording();
      setStep('listening');
    }
  };

  const handleParse = async () => {
    if (listening || recording) {
      stop();
      stopRecording();
    }

    const textToParse = inputText.trim() || transcript.trim();
    if (!textToParse && !audioBlob) return;

    setStep('parsing');
    setParseError(null);

    try {
      let response;

      // Use ElevenLabs STT Audio Transcription if audio blob is recorded
      if (audioBlob) {
        response = await voiceApi.transcribeAudio(audioBlob);
        if (response?.data?.raw_transcript) {
          setInputText(response.data.raw_transcript);
        }
      } else {
        response = await voiceApi.parse(textToParse);
      }

      const items = response?.data?.drafts || [];
      if (items.length === 0) {
        setParseError('AI tidak menemukan transaksi dalam kalimat tersebut. Coba gunakan frasa lain.');
        setStep('idle');
        return;
      }

      const formattedDrafts = items.map((item, idx) => ({
        id: `draft-${Date.now()}-${idx}`,
        transaction_type: item.transaction_type || 'expense',
        amount: item.amount || 0,
        category_id: item.category_id || '',
        account_id: item.account_id || (accounts[0]?.value || ''),
        need_type: item.need_type || (item.transaction_type === 'income' ? '' : 'need'),
        transaction_date: item.transaction_date || new Date().toISOString().split('T')[0],
        description: item.description || '',
        confidence: item.confidence || 'medium',
      }));

      setDrafts(formattedDrafts);
      setStep('review');
    } catch (err) {
      console.error('Failed to parse voice transaction:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Gagal memproses suara/kalimat. Pastikan koneksi & API Key sudah benar.';
      setParseError(errMsg);

      if (err?.response?.status === 429 || errMsg.includes('429') || errMsg.includes('kuota') || errMsg.includes('Quota')) {
        setCountdown(30);
      }

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
        const payload = {
          transaction_type: draft.transaction_type,
          amount: Number(draft.amount),
          category_id: draft.category_id || null,
          account_id: draft.account_id || null,
          need_type: draft.transaction_type === 'income' ? null : draft.need_type || 'need',
          transaction_date: draft.transaction_date,
          description: draft.description,
        };

        await resourcesApi.create('/transactions', payload);
        successCounter++;
        if (draft.transaction_date) {
          monthsToAlertCheck.add(draft.transaction_date.substring(0, 7) + '-01');
        }
      }

      setSavedCount(successCounter);

      // Check budget alerts for the affected month(s)
      const alertsCollected = [];
      for (const monthStr of monthsToAlertCheck) {
        try {
          const res = await apiGet('/budget-alerts', { month: monthStr });
          if (res?.data?.alerts && Array.isArray(res.data.alerts)) {
            alertsCollected.push(...res.data.alerts);
          }
        } catch {
          // ignore budget alert fetch error silently
        }
      }
      setBudgetAlerts(alertsCollected);
      setStep('done');

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error saving voice transactions:', err);
      setParseError(err?.response?.data?.message || 'Beberapa transaksi gagal disimpan. Periksa kelengkapan data.');
      setStep('review');
    }
  };

  const samplePrompts = [
    'Beli kopi 35rb pakai BCA dan dapat transfer 500rb ke Mandiri',
    'Kemarin dapat bonus 1.5 juta ke Kantong Utama dan bayar listrik 200rb',
    'Beli belanja mingguan 150 ribu potong dari Cash',
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      fullScreenOnMobile
      title="Catat dengan Suara"
      description="Sebutkan atau ketik transaksi Anda dalam kalimat biasa, AI akan mengekstrak otomatis."
    >
      {/* ------------------------------------------------------------------ */}
      {/*  MOBILE-ONLY APP-LIKE LAYOUT                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col space-y-5 md:hidden">
        {/* Error Alert */}
        {parseError && (
          <div className={cn(
            "flex items-start gap-3 rounded-2xl p-4 text-sm text-white shadow-md transition-all",
            parseError.includes('429') || parseError.includes('kuota') || parseError.includes('Quota')
              ? "bg-amber-600"
              : "bg-danger-600"
          )}>
            <AlertTriangle className="mt-0.5 shrink-0 text-white/95" size={20} />
            <div className="flex-1 space-y-1.5">
              <p className="font-semibold text-white leading-snug">{parseError}</p>
              {(parseError.includes('429') || parseError.includes('kuota') || parseError.includes('Quota')) && (
                <div>
                  {countdown > 0 ? (
                    <div className="mt-1.5 inline-flex items-center gap-2 rounded-xl bg-amber-700/90 px-3 py-1.5 text-xs font-semibold text-white">
                      <Timer size={14} className="animate-spin text-amber-200" />
                      <span>Tunggu <strong className="font-mono text-sm text-amber-200">{countdown}s</strong></span>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs font-medium text-amber-100">
                      Silakan tekan tombol di bawah untuk mencoba kembali.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 1 & 2: INPUT MODE (IDLE / LISTENING / RECORDING) */}
        {(step === 'idle' || step === 'listening') && (
          <div className="flex flex-col space-y-5">
            {/* iOS-Style Segment Control */}
            <div className="flex rounded-2xl bg-surface-100 p-1 border border-border-subtle">
              <button
                type="button"
                onClick={() => {
                  if (listening || recording) {
                    stop();
                    stopRecording();
                  }
                  setActiveInputMode('voice');
                  setStep('idle');
                }}
                className={cn(
                  "flex-1 py-2.5 text-center text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5",
                  activeInputMode === 'voice'
                    ? "bg-surface-panel text-primary-600 shadow-sm border border-border-subtle"
                    : "text-text-muted"
                )}
              >
                <Mic size={14} />
                🎙️ Suara AI
              </button>
              <button
                type="button"
                onClick={() => {
                  if (listening || recording) {
                    stop();
                    stopRecording();
                  }
                  setActiveInputMode('text');
                  setStep('idle');
                }}
                className={cn(
                  "flex-1 py-2.5 text-center text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5",
                  activeInputMode === 'text'
                    ? "bg-surface-panel text-primary-600 shadow-sm border border-border-subtle"
                    : "text-text-muted"
                )}
              >
                <Sparkles size={14} />
                ⌨️ Ketik Teks
              </button>
            </div>

            {activeInputMode === 'voice' ? (
              /* Immersive Audio Recorder View */
              <div className="flex flex-col items-center justify-center rounded-3xl border border-border-subtle bg-gradient-to-b from-surface-panel to-surface-100/50 p-6 text-center shadow-xs">
                <div className="relative flex h-36 w-36 items-center justify-center">
                  {/* Glowing Pulse Rings */}
                  {(listening || recording) && (
                    <>
                      <div className="absolute inset-0 animate-ping rounded-full bg-danger-500/20" />
                      <div className="absolute inset-2 animate-pulse rounded-full bg-danger-500/10" />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={handleToggleMic}
                    className={cn(
                      'relative z-10 flex h-24 w-24 items-center justify-center rounded-full text-white duration-300 active:scale-90',
                      listening || recording
                        ? 'bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.7)]'
                        : 'bg-violet-600 animate-neon-pulse-purple hover:bg-violet-700'
                    )}
                  >
                    {listening || recording ? <MicOff size={36} /> : <Mic size={36} />}
                  </button>
                </div>

                <h3 className="mt-5 text-base font-bold text-text-title">
                  {listening || recording ? 'Mendengarkan ucapanmu...' : 'Ketuk mikrofon untuk bicara'}
                </h3>
                <p className="mt-1.5 max-w-xs text-xs text-text-muted leading-relaxed">
                  {listening || recording ? 'Bicaralah dalam kalimat biasa seperti "Beli soto 15rb pakai Tunai"' : supported ? 'Sebutkan transaksi nominal, kategori, dan rekening Anda' : 'Speech recognition tidak didukung browser ini, ketik manual melalui tab di atas'}
                </p>

                {(listening || recording) && (
                  <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-[11px] font-bold text-primary-600 animate-pulse">
                    <Volume2 size={13} /> ElevenLabs Speech-to-Text Aktif
                  </span>
                )}
              </div>
            ) : (
              /* Text Input Area */
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Teks Transaksi Anda</label>
                <textarea
                  rows={4}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Contoh: Belanja bulanan habis 450rb pakai Mandiri dan makan siang 35rb potong Tunai."
                  className="w-full rounded-2xl border border-border-subtle bg-surface-panel p-4 text-sm text-text-title focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/10"
                />
              </div>
            )}

            {/* Display Transcript peeking out */}
            {activeInputMode === 'voice' && inputText && (
              <div className="rounded-2xl border border-primary-500/10 bg-primary-500/5 p-4 text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600">Hasil Ucapan</span>
                <p className="mt-1 text-sm font-semibold text-text-title italic">"{inputText}"</p>
              </div>
            )}
            {/* Floating/Bottom Action Bar */}
            <div className="pt-2">
              <Button
                variant="primary"
                fullWidth
                disabled={(!inputText.trim() && !transcript.trim()) || countdown > 0}
                onClick={handleParse}
                className="gap-2 rounded-2xl py-3.5 text-sm font-bold shadow-md bg-linear-to-r from-amber-500 to-primary-600"
              >
                {countdown > 0 ? (
                  <>
                    <Timer size={18} className="animate-spin text-amber-200" />
                    <span>Tunggu {countdown}s</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} className="text-amber-200 animate-pulse" />
                    <span>Ekstrak Mutasi via AI</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: PARSING RUNNING */}
        {step === 'parsing' && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-500/10 text-primary-600">
              <Loader2 className="animate-spin" size={40} />
              <Sparkles className="absolute -right-2 -top-2 text-amber-500 animate-bounce" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-text-title">AI Sedang Bekerja...</h3>
              <p className="mt-1 max-w-xs text-xs text-text-muted leading-relaxed">WeeB AI sedang mengidentifikasi nominal transaksi, kategori pengeluaran, dan sumber rekening.</p>
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW DRAFTS LIST */}
        {step === 'review' && (
          <div className="flex flex-col space-y-4">
            {/* Sticky/Fixed Summary */}
            <div className="flex items-center justify-between rounded-2xl bg-surface-100 p-3.5 border border-border-subtle">
              <span className="text-xs font-bold text-text-body">Draf AI: <strong className="text-primary-600 text-sm font-bold">{drafts.length} Transaksi</strong></span>
              <button
                type="button"
                onClick={() => setStep('idle')}
                className="flex items-center gap-1 text-xs text-primary-600 font-bold hover:underline"
              >
                <RefreshCw size={13} /> Ulangi Kalimat
              </button>
            </div>

            {/* Cards Stack */}
            <div className="space-y-4">
              {drafts.map((draft, idx) => {
                const filteredCategories = categories.filter(
                  (c) => c.type === draft.transaction_type || c.type === 'both'
                );

                return (
                  <div
                    key={draft.id}
                    className="relative rounded-3xl border border-border-subtle bg-surface-panel p-5 shadow-xs space-y-4"
                  >
                    {/* Header Row: Pill Switcher + Delete */}
                    <div className="flex items-center justify-between gap-2 border-b border-border-subtle pb-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-100 text-[11px] font-bold text-text-muted">
                          {idx + 1}
                        </span>
                        <div className="inline-flex rounded-xl bg-surface-100 p-0.5 border border-border-subtle">
                          <button
                            type="button"
                            onClick={() => handleUpdateDraft(idx, 'transaction_type', 'expense')}
                            className={cn(
                              'rounded-lg px-3 py-1 text-[11px] font-bold transition-all',
                              draft.transaction_type === 'expense'
                                ? 'bg-danger-500 text-white shadow-sm'
                                : 'text-text-muted'
                            )}
                          >
                            Keluar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateDraft(idx, 'transaction_type', 'income')}
                            className={cn(
                              'rounded-lg px-3 py-1 text-[11px] font-bold transition-all',
                              draft.transaction_type === 'income'
                                ? 'bg-success-base text-white shadow-sm'
                                : 'text-text-muted'
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

                    {/* Numeric Input */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Nominal (Rupiah)</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-text-muted">Rp</span>
                        <input
                          type="number"
                          value={draft.amount}
                          onChange={(e) => handleUpdateDraft(idx, 'amount', e.target.value)}
                          className="w-full rounded-2xl border border-border-subtle bg-surface-panel py-3 pl-10 pr-3.5 text-base font-bold text-text-title focus:border-primary-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Deskripsi / Keterangan</label>
                      <input
                        type="text"
                        value={draft.description}
                        onChange={(e) => handleUpdateDraft(idx, 'description', e.target.value)}
                        className="w-full rounded-2xl border border-border-subtle bg-surface-panel px-3.5 py-3 text-sm text-text-title focus:border-primary-500 focus:outline-none"
                      />
                    </div>

                    {/* Account Scoping */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
                        {draft.transaction_type === 'income' ? 'Rekening Penerima' : 'Rekening Sumber'}
                      </label>
                      <select
                        value={draft.account_id || ''}
                        onChange={(e) => handleUpdateDraft(idx, 'account_id', e.target.value)}
                        className="w-full rounded-2xl border border-border-subtle bg-surface-panel px-3.5 py-3 text-sm text-text-title focus:border-primary-500 focus:outline-none"
                      >
                        <option value="">-- Pilih Rekening --</option>
                        {accounts.map((acc) => (
                          <option key={acc.value} value={acc.value}>
                            {acc.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Category Selector */}
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Kategori</label>
                      <select
                        value={draft.category_id || ''}
                        onChange={(e) => handleUpdateDraft(idx, 'category_id', e.target.value)}
                        className="w-full rounded-2xl border border-border-subtle bg-surface-panel px-3.5 py-3 text-sm text-text-title focus:border-primary-500 focus:outline-none"
                      >
                        <option value="">-- Pilih Kategori --</option>
                        {filteredCategories.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Meta Row: Date & Classification */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Tanggal</label>
                        <input
                          type="date"
                          value={draft.transaction_date}
                          onChange={(e) => handleUpdateDraft(idx, 'transaction_date', e.target.value)}
                          className="w-full rounded-2xl border border-border-subtle bg-surface-panel px-3 py-2.5 text-xs text-text-title focus:border-primary-500 focus:outline-none"
                        />
                      </div>

                      {draft.transaction_type === 'expense' && (
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1.5">Klasifikasi</label>
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

            {/* Quick Actions at Bottom of Review */}
            <div className="space-y-3 pt-3">
              <button
                type="button"
                onClick={handleAddDraftCard}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border-subtle bg-surface-100/50 py-3 text-xs font-bold text-text-muted transition-colors hover:bg-surface-100"
              >
                <Plus size={15} /> Tambah Transaksi Manual
              </button>

              <Button
                variant="primary"
                fullWidth
                disabled={drafts.length === 0}
                onClick={handleConfirmSave}
                className="gap-2 rounded-2xl py-3.5 text-sm font-bold shadow-md bg-linear-to-r from-success-base to-primary-600"
              >
                Simpan {drafts.length} Transaksi <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: SAVING */}
        {step === 'saving' && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <Loader2 className="animate-spin text-primary-600" size={44} />
            <div>
              <h3 className="text-lg font-bold text-text-title">Menyimpan Keuangan...</h3>
              <p className="mt-1 text-xs text-text-muted">Memperbarui saldo rekening dan mencatat data mutasi.</p>
            </div>
          </div>
        )}

        {/* STEP 6: DONE */}
        {step === 'done' && (
          <div className="space-y-6 py-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success-50 text-success-base dark:bg-success-950/40">
              <CheckCircle2 size={48} />
            </div>

            <div>
              <h3 className="text-xl font-bold text-text-title">
                {savedCount} Transaksi Disimpan!
              </h3>
              <p className="mt-1.5 text-xs text-text-muted">
                Daftar mutasi telah diperbarui dan saldo rekening telah disesuaikan secara otomatis.
              </p>
            </div>

            {/* Alerts Mobile */}
            {budgetAlerts.length > 0 && (
              <div className="rounded-3xl border border-amber-200 bg-amber-500/5 p-4 text-left space-y-3">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                  Sisa Budget Bulanan Menipis
                </div>
                <div className="space-y-2">
                  {budgetAlerts.map((alert) => (
                    <div key={alert.category_id} className="text-xs text-text-body bg-surface-panel/80 p-3 rounded-2xl border border-amber-200/50 flex flex-col space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-text-title">{alert.category_name}</span>
                        <span className={cn(
                          'px-2 py-0.5 rounded-md text-[9px] font-bold uppercase',
                          alert.status === 'exceeded' ? 'bg-danger-500 text-white' : 'bg-amber-500 text-white'
                        )}>
                          {alert.usage_percent}% {alert.status === 'exceeded' ? 'Melebihi' : 'Hampir Habis'}
                        </span>
                      </div>
                      <div className="w-full bg-surface-200 h-1.5 rounded-full overflow-hidden">
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

            <Button
              variant="primary"
              fullWidth
              onClick={onClose}
              className="rounded-2xl py-3.5 font-bold shadow-md"
            >
              Selesai & Kembali ke Dashboard
            </Button>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/*  DESKTOP-ONLY DEFAULT LAYOUT                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="hidden md:block space-y-5">
        {/* Error Alert */}
        {parseError && (
          <div className={cn(
            "flex items-start gap-3 rounded-2xl p-4 text-sm text-white shadow-md transition-all",
            parseError.includes('429') || parseError.includes('kuota') || parseError.includes('Quota')
              ? "bg-amber-600"
              : "bg-danger-600"
          )}>
            <AlertTriangle className="mt-0.5 shrink-0 text-white/90" size={20} />
            <div className="flex-1 space-y-1.5">
              <p className="font-semibold text-white leading-snug">{parseError}</p>
              {(parseError.includes('429') || parseError.includes('kuota') || parseError.includes('Quota')) && (
                <div>
                  {countdown > 0 ? (
                    <div className="mt-1.5 inline-flex items-center gap-2 rounded-xl bg-amber-700/90 px-3 py-1.5 text-xs font-semibold text-white shadow-xs">
                      <Timer size={15} className="animate-spin text-amber-200" />
                      <span>Silakan tunggu <strong className="font-mono text-sm text-amber-200">{countdown}s</strong> sebelum mencoba lagi</span>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs font-medium text-amber-100">
                      ✅ Waktu tunggu selesai. Anda dapat menekan tombol di bawah untuk mencoba kembali.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 1: IDLE / LISTENING */}
        {(step === 'idle' || step === 'listening') && (
          <div className="space-y-5">
            {/* Mic Pulse Box */}
            <div className="flex flex-col items-center justify-center rounded-3xl border border-border-subtle bg-surface-100/60 p-6 text-center">
              <button
                type="button"
                onClick={handleToggleMic}
                className={cn(
                  'relative flex h-20 w-20 items-center justify-center rounded-full text-white duration-300 active:scale-95',
                  listening
                    ? 'bg-red-500 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.7)]'
                    : 'bg-violet-600 animate-neon-pulse-purple hover:bg-violet-700'
                )}
              >
                {listening ? <MicOff size={32} /> : <Mic size={32} />}
              </button>

              <p className="mt-4 text-sm font-medium text-text-title">
                {listening ? 'Sedang mendengarkan... Bicara sekarang' : supported ? 'Ketuk mikrofon untuk bicara' : 'Bicara tidak didukung browser ini, ketik kalimat di bawah'}
              </p>
              {(listening || recording) && (
                <span className="mt-1 flex items-center gap-1.5 text-xs text-primary-600 font-semibold animate-pulse">
                  <Volume2 size={14} className="text-primary-500" /> ElevenLabs Speech-to-Text (Scribe v1) Aktif
                </span>
              )}
            </div>

            {/* Input Text Area */}
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-muted">
                Transkrip / Teks Transaksi
              </label>
              <textarea
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Contoh: Tadi pagi beli sarapan 25rb dan bayar parkir 5 ribu"
                className="w-full rounded-2xl border border-border-subtle bg-surface-panel p-3.5 text-sm text-text-title placeholder:text-text-muted focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
              />
            </div>

            {/* Sample Prompts */}
            <div>
              <p className="mb-2 text-xs font-medium text-text-muted">Coba contoh kalimat ini:</p>
              <div className="flex flex-wrap gap-2">
                {samplePrompts.map((prompt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setInputText(prompt);
                      setStep('idle');
                    }}
                    className="rounded-xl border border-border-subtle bg-surface-100 px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-primary-500/30 hover:bg-primary-500/10 hover:text-primary-600"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Parse Action */}
            <div className="pt-2">
              <Button
                variant="primary"
                fullWidth
                disabled={(!inputText.trim() && !transcript.trim()) || countdown > 0}
                onClick={handleParse}
                className="gap-2 rounded-2xl py-3 text-sm font-semibold shadow-md"
              >
                {countdown > 0 ? (
                  <>
                    <Timer size={18} className="animate-spin text-amber-200" />
                    <span>Tunggu {countdown}s Untuk Mencoba Lagi</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>Ekstrak dengan WeeB AI</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: PARSING LOADING */}
        {step === 'parsing' && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-600">
              <Loader2 className="animate-spin" size={36} />
              <Sparkles className="absolute -right-1 -top-1 text-primary-500" size={18} />
            </div>
            <h3 className="mt-4 text-base font-semibold text-text-title">Menganalisis Transaksi...</h3>
            <p className="mt-1 text-xs text-text-muted">WeeB AI sedang mengidentifikasi nominal, kategori, dan tanggal</p>
          </div>
        )}

        {/* STEP 3: REVIEW DRAFTS */}
        {step === 'review' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl bg-surface-100 p-3 text-xs text-text-muted">
              <span>Hasil AI: <strong className="text-text-title">{drafts.length} transaksi</strong> ditemukan</span>
              <button
                type="button"
                onClick={() => setStep('idle')}
                className="flex items-center gap-1 text-primary-600 font-semibold hover:underline"
              >
                <RefreshCw size={12} /> Ulangi Teks
              </button>
            </div>

            <div className="space-y-4">
              {drafts.map((draft, idx) => {
                const filteredCategories = categories.filter(
                  (c) => c.type === draft.transaction_type || c.type === 'both'
                );

                return (
                  <div
                    key={draft.id}
                    className="relative rounded-2xl border border-border-subtle bg-surface-panel p-4 shadow-sm space-y-3"
                  >
                    {/* Header Row: Type + Delete */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-muted">#{idx + 1}</span>
                        <div className="inline-flex rounded-xl bg-surface-200 p-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateDraft(idx, 'transaction_type', 'expense')}
                            className={cn(
                              'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                              draft.transaction_type === 'expense'
                                ? 'bg-danger-500 text-white shadow-xs'
                                : 'text-text-muted hover:text-text-title'
                            )}
                          >
                            Pengeluaran
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateDraft(idx, 'transaction_type', 'income')}
                            className={cn(
                              'rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                              draft.transaction_type === 'income'
                                ? 'bg-success-base text-white shadow-xs'
                                : 'text-text-muted hover:text-text-title'
                            )}
                          >
                            Pemasukan
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteDraft(idx)}
                        className="rounded-xl p-1.5 text-text-muted hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-950/30"
                        title="Hapus draft ini"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Amount & Description */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-text-muted mb-1">Nominal (Rp)</label>
                        <input
                          type="number"
                          value={draft.amount}
                          onChange={(e) => handleUpdateDraft(idx, 'amount', e.target.value)}
                          className="w-full rounded-xl border border-border-subtle bg-surface-panel p-2.5 text-sm font-bold text-text-title focus:border-primary-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-text-muted mb-1">Deskripsi</label>
                        <input
                          type="text"
                          value={draft.description}
                          onChange={(e) => handleUpdateDraft(idx, 'description', e.target.value)}
                          className="w-full rounded-xl border border-border-subtle bg-surface-panel p-2.5 text-sm text-text-title focus:border-primary-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Category & Account */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-text-muted mb-1">Kategori</label>
                        <select
                          value={draft.category_id || ''}
                          onChange={(e) => handleUpdateDraft(idx, 'category_id', e.target.value)}
                          className="w-full rounded-xl border border-border-subtle bg-surface-panel p-2.5 text-xs text-text-title focus:border-primary-500 focus:outline-none"
                        >
                          <option value="">-- Pilih Kategori --</option>
                          {filteredCategories.map((cat) => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-text-muted mb-1">
                          {draft.transaction_type === 'income' ? 'Rekening Tujuan (Ditambah)' : 'Rekening Sumber (Dipotong)'}
                        </label>
                        <select
                          value={draft.account_id || ''}
                          onChange={(e) => handleUpdateDraft(idx, 'account_id', e.target.value)}
                          className="w-full rounded-xl border border-border-subtle bg-surface-panel p-2.5 text-xs text-text-title focus:border-primary-500 focus:outline-none"
                        >
                          <option value="">-- Pilih Rekening --</option>
                          {accounts.map((acc) => (
                            <option key={acc.value} value={acc.value}>
                              {acc.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Date & Need Type */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-text-muted mb-1">Tanggal</label>
                        <input
                          type="date"
                          value={draft.transaction_date}
                          onChange={(e) => handleUpdateDraft(idx, 'transaction_date', e.target.value)}
                          className="w-full rounded-xl border border-border-subtle bg-surface-panel p-2 text-xs text-text-title focus:border-primary-500 focus:outline-none"
                        />
                      </div>

                      {draft.transaction_type === 'expense' && (
                        <div>
                          <label className="block text-[11px] font-semibold text-text-muted mb-1">Klasifikasi</label>
                          <select
                            value={draft.need_type || 'need'}
                            onChange={(e) => handleUpdateDraft(idx, 'need_type', e.target.value)}
                            className="w-full rounded-xl border border-border-subtle bg-surface-panel p-2 text-xs text-text-title focus:border-primary-500 focus:outline-none"
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
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border-subtle bg-surface-100/50 py-3 text-xs font-semibold text-text-muted transition-colors hover:bg-surface-100 hover:text-text-title"
            >
              <Plus size={16} /> Tambah Transaksi Manual
            </button>

            {/* Actions */}
            <div className="pt-3">
              <Button
                variant="primary"
                fullWidth
                disabled={drafts.length === 0}
                onClick={handleConfirmSave}
                className="gap-2 rounded-2xl py-3 text-sm font-semibold shadow-md"
              >
                Konfirmasi & Simpan {drafts.length} Transaksi <ArrowRight size={16} />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: SAVING */}
        {step === 'saving' && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="animate-spin text-primary-600" size={40} />
            <h3 className="mt-4 text-base font-semibold text-text-title">Menyimpan Transaksi...</h3>
            <p className="mt-1 text-xs text-text-muted">Memperbarui saldo rekening dan mencatat data transaksi</p>
          </div>
        )}

        {/* STEP 5: DONE + BUDGET ALERT */}
        {step === 'done' && (
          <div className="space-y-5 py-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-success-base dark:bg-success-950/40">
              <CheckCircle2 size={40} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-text-title">
                {savedCount} Transaksi Berhasil Disimpan!
              </h3>
              <p className="mt-1 text-xs text-text-muted">
                Saldo rekening telah disesuaikan secara otomatis.
              </p>
            </div>

            {/* Budget Alerts Banner */}
            {budgetAlerts.length > 0 && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-left dark:border-amber-800/50 dark:bg-amber-950/40 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-semibold text-xs uppercase tracking-wider">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  Peringatan Budget Bulanan
                </div>
                <div className="space-y-2">
                  {budgetAlerts.map((alert) => (
                    <div key={alert.category_id} className="text-xs text-amber-900 dark:text-amber-100 flex justify-between items-center bg-white/60 dark:bg-black/20 p-2.5 rounded-xl border border-amber-200/50">
                      <div>
                        <span className="font-semibold">{alert.category_name}</span>
                        <span className="block text-[11px] text-amber-700 dark:text-amber-300">
                          Terpakai: {formatCurrency(alert.spent_amount)} / {formatCurrency(alert.allocated_amount)}
                        </span>
                      </div>
                      <span className={cn(
                        'px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase',
                        alert.status === 'exceeded' ? 'bg-danger-500 text-white' : 'bg-amber-500 text-white'
                      )}>
                        {alert.usage_percent}% ({alert.status === 'exceeded' ? 'MELEBIHI' : 'HAMPIR HABIS'})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="primary"
              fullWidth
              onClick={onClose}
              className="rounded-2xl py-3 font-semibold"
            >
              Selesai & Tutup
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
