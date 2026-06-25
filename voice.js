/**
 * WaiterFlow — Голосовой модуль
 * SpeechRecognition для голосовых команд официанта
 * SpeechSynthesis для озвучки подтверждений
 */
;(function() {
  'use strict';

  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  const synthesis = window.speechSynthesis;

  let recognition = null;
  let listening = false;
  let resultCallback = null;
  let errorCallback = null;
  let stateChangeCallback = null;
  let voiceRate = 1.0;

  const VoiceManager = {
    isSupported: !!SpeechRecognitionAPI,

    init() {
      if (!SpeechRecognitionAPI) {
        console.warn('[Voice] SpeechRecognition not supported');
        return false;
      }

      recognition = new SpeechRecognitionAPI();
      recognition.lang = 'ru-RU';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript.trim();
        const isFinal = result.isFinal;
        if (resultCallback) resultCallback({ transcript, isFinal, confidence: result[0].confidence });
      };

      recognition.onerror = (event) => {
        console.error('[Voice] Error:', event.error);
        if (event.error === 'aborted') return;
        if (errorCallback) errorCallback(event.error);
        setListening(false);
      };

      recognition.onend = () => setListening(false);
      recognition.onstart = () => setListening(true);

      console.log('[Voice] Initialized');
      return true;
    },

    startListening() {
      if (!recognition || listening) return;
      try {
        recognition.start();
      } catch (e) {
        try {
          recognition.stop();
          setTimeout(() => { try { recognition.start(); } catch(e2) {} }, 150);
        } catch(e2) {}
      }
    },

    stopListening() {
      if (!recognition) return;
      try { recognition.stop(); } catch(e) {}
      setListening(false);
    },

    speak(text, rate) {
      if (!synthesis) return;
      synthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ru-RU';
      utterance.rate = rate || voiceRate;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      const voices = synthesis.getVoices();
      const russianVoice = voices.find(v => v.lang.startsWith('ru'));
      if (russianVoice) utterance.voice = russianVoice;
      synthesis.speak(utterance);
    },

    setRate(rate) { voiceRate = Math.max(0.1, Math.min(10, rate)); },
    onResult(cb) { resultCallback = cb; },
    onError(cb) { errorCallback = cb; },
    onStateChange(cb) { stateChangeCallback = cb; },
    get isListening() { return listening; }
  };

  function setListening(value) {
    const changed = listening !== value;
    listening = value;
    if (changed && stateChangeCallback) stateChangeCallback(value);
  }

  window.VoiceManager = VoiceManager;

  if (synthesis) {
    synthesis.getVoices();
    synthesis.onvoiceschanged = () => synthesis.getVoices();
  }
})();
