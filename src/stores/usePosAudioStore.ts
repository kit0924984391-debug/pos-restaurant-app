import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ServiceCallAlertMode = 'BOTH' | 'VOICE_ONLY' | 'CHIME_ONLY' | 'MUTE';

interface PosAudioState {
  voiceEnabled: boolean;
  soundEffectEnabled: boolean;
  serviceCallAlertMode: ServiceCallAlertMode;
  _hasHydrated: boolean;
}

interface PosAudioActions {
  setVoiceEnabled: (enabled: boolean) => void;
  toggleVoice: () => void;
  setSoundEffectEnabled: (enabled: boolean) => void;
  setServiceCallAlertMode: (mode: ServiceCallAlertMode) => void;
  setHasHydrated: (hydrated: boolean) => void;
}

export type PosAudioStore = PosAudioState & PosAudioActions;

export const usePosAudioStore = create<PosAudioStore>()(
  persist(
    (set, get) => ({
      voiceEnabled: true,
      soundEffectEnabled: true,
      serviceCallAlertMode: 'BOTH',
      _hasHydrated: false,

      setVoiceEnabled: (enabled: boolean) => {
        set({ voiceEnabled: enabled });
        // Legacy event dispatching to guarantee 100% backward compatibility
        if (typeof window !== 'undefined') {
          localStorage.setItem('pos_voice_enabled', String(enabled));
          window.dispatchEvent(
            new CustomEvent('pos-voice-changed', { detail: { enabled } })
          );
        }
      },

      toggleVoice: () => {
        const next = !get().voiceEnabled;
        get().setVoiceEnabled(next);
      },

      setSoundEffectEnabled: (enabled: boolean) => {
        set({ soundEffectEnabled: enabled });
      },

      setServiceCallAlertMode: (mode: ServiceCallAlertMode) => {
        set({ serviceCallAlertMode: mode });
        if (typeof window !== 'undefined') {
          localStorage.setItem('pos_service_call_alert_mode', mode);
        }
      },

      setHasHydrated: (hydrated: boolean) => {
        set({ _hasHydrated: hydrated });
      },
    }),
    {
      name: 'pos_audio_settings',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
