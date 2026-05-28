import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  AppSettings,
  AppView,
  Movement,
  MovementTemplate,
  PlaybackState,
  Routine,
} from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  warnBeforeSeconds: 3,
  voiceLang: 'es-AR',
  voiceURI: null,
  voiceRate: 0.9,
  voicePitch: 1.0,
  voiceVolume: 1.0,
  energyPreset: 'normal',
  announceNextMovement: true,
  startCountdownSeconds: 5,
  spotifyEnabled: false,
  spotifyClientId: '',
  premiumVoiceEnabled: false,
  premiumVoiceId: 'es-AR-ElenaNeural',
};

interface AppStore {
  routines: Routine[];
  movementTemplates: MovementTemplate[];
  activeRoutineId: string | null;
  settings: AppSettings;
  playback: PlaybackState | null;
  view: AppView;

  setView: (view: AppView) => void;
  setActiveRoutine: (id: string | null) => void;

  saveMovementAsTemplate: (movement: Movement) => string;
  deleteTemplate: (templateId: string) => void;
  updateTemplate: (templateId: string, partial: Partial<Omit<MovementTemplate, 'id' | 'createdAt'>>) => void;
  addTemplateToRoutine: (routineId: string, templateId: string) => void;

  createRoutine: (name: string) => string;
  updateRoutine: (id: string, partial: Partial<Omit<Routine, 'id' | 'createdAt'>>) => void;
  deleteRoutine: (id: string) => void;
  duplicateRoutine: (id: string) => string | null;

  addMovement: (routineId: string, movement: Omit<Movement, 'id'>) => void;
  updateMovement: (routineId: string, movementId: string, partial: Partial<Omit<Movement, 'id'>>) => void;
  deleteMovement: (routineId: string, movementId: string) => void;
  reorderMovements: (routineId: string, fromIndex: number, toIndex: number) => void;

  updateSettings: (partial: Partial<AppSettings>) => void;

  startPlayback: (routineId: string) => void;
  setPlayback: (partial: Partial<PlaybackState>) => void;
  endPlayback: () => void;
}

function withUpdatedTimestamp(routine: Routine, mutator: (r: Routine) => Routine): Routine {
  const next = mutator(routine);
  return { ...next, updatedAt: Date.now() };
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      routines: [],
      movementTemplates: [],
      activeRoutineId: null,
      settings: DEFAULT_SETTINGS,
      playback: null,
      view: 'home',

      setView: (view) => set({ view }),
      setActiveRoutine: (id) => set({ activeRoutineId: id }),

      saveMovementAsTemplate: (movement) => {
        // Si existe una plantilla con el mismo nombre + duración, no duplicamos: devolvemos esa.
        const existing = get().movementTemplates.find(
          (t) =>
            t.name.trim().toLowerCase() === movement.name.trim().toLowerCase() &&
            t.duration === movement.duration,
        );
        if (existing) return existing.id;
        const tpl: MovementTemplate = {
          id: nanoid(),
          name: movement.name.trim() || 'Sin nombre',
          duration: movement.duration,
          notes: movement.notes,
          warnBeforeSeconds: movement.warnBeforeSeconds,
          createdAt: Date.now(),
          usageCount: 0,
        };
        set((state) => ({ movementTemplates: [tpl, ...state.movementTemplates] }));
        return tpl.id;
      },

      deleteTemplate: (templateId) =>
        set((state) => ({
          movementTemplates: state.movementTemplates.filter((t) => t.id !== templateId),
        })),

      updateTemplate: (templateId, partial) =>
        set((state) => ({
          movementTemplates: state.movementTemplates.map((t) =>
            t.id === templateId ? { ...t, ...partial } : t,
          ),
        })),

      addTemplateToRoutine: (routineId, templateId) => {
        const tpl = get().movementTemplates.find((t) => t.id === templateId);
        if (!tpl) return;
        const movement: Movement = {
          id: nanoid(),
          name: tpl.name,
          duration: tpl.duration,
          notes: tpl.notes,
          warnBeforeSeconds: tpl.warnBeforeSeconds,
        };
        set((state) => ({
          routines: state.routines.map((r) =>
            r.id === routineId
              ? withUpdatedTimestamp(r, (curr) => ({
                  ...curr,
                  movements: [...curr.movements, movement],
                }))
              : r,
          ),
          movementTemplates: state.movementTemplates.map((t) =>
            t.id === templateId ? { ...t, usageCount: t.usageCount + 1 } : t,
          ),
        }));
      },

      createRoutine: (name) => {
        const id = nanoid();
        const now = Date.now();
        const routine: Routine = {
          id,
          name: name.trim() || 'Rutina sin nombre',
          createdAt: now,
          updatedAt: now,
          movements: [],
        };
        set((state) => ({
          routines: [routine, ...state.routines],
          activeRoutineId: id,
          view: 'editor',
        }));
        return id;
      },

      updateRoutine: (id, partial) =>
        set((state) => ({
          routines: state.routines.map((r) =>
            r.id === id ? withUpdatedTimestamp(r, (curr) => ({ ...curr, ...partial })) : r,
          ),
        })),

      deleteRoutine: (id) =>
        set((state) => ({
          routines: state.routines.filter((r) => r.id !== id),
          activeRoutineId: state.activeRoutineId === id ? null : state.activeRoutineId,
        })),

      duplicateRoutine: (id) => {
        const source = get().routines.find((r) => r.id === id);
        if (!source) return null;
        const newId = nanoid();
        const now = Date.now();
        const copy: Routine = {
          ...source,
          id: newId,
          name: `${source.name} (copia)`,
          createdAt: now,
          updatedAt: now,
          movements: source.movements.map((m) => ({ ...m, id: nanoid() })),
        };
        set((state) => ({ routines: [copy, ...state.routines] }));
        return newId;
      },

      addMovement: (routineId, movement) =>
        set((state) => ({
          routines: state.routines.map((r) =>
            r.id === routineId
              ? withUpdatedTimestamp(r, (curr) => ({
                  ...curr,
                  movements: [...curr.movements, { ...movement, id: nanoid() }],
                }))
              : r,
          ),
        })),

      updateMovement: (routineId, movementId, partial) =>
        set((state) => ({
          routines: state.routines.map((r) =>
            r.id === routineId
              ? withUpdatedTimestamp(r, (curr) => ({
                  ...curr,
                  movements: curr.movements.map((m) =>
                    m.id === movementId ? { ...m, ...partial } : m,
                  ),
                }))
              : r,
          ),
        })),

      deleteMovement: (routineId, movementId) =>
        set((state) => ({
          routines: state.routines.map((r) =>
            r.id === routineId
              ? withUpdatedTimestamp(r, (curr) => ({
                  ...curr,
                  movements: curr.movements.filter((m) => m.id !== movementId),
                }))
              : r,
          ),
        })),

      reorderMovements: (routineId, fromIndex, toIndex) =>
        set((state) => ({
          routines: state.routines.map((r) => {
            if (r.id !== routineId) return r;
            const list = [...r.movements];
            if (
              fromIndex < 0 ||
              fromIndex >= list.length ||
              toIndex < 0 ||
              toIndex >= list.length ||
              fromIndex === toIndex
            ) {
              return r;
            }
            const [moved] = list.splice(fromIndex, 1);
            list.splice(toIndex, 0, moved);
            return withUpdatedTimestamp(r, (curr) => ({ ...curr, movements: list }));
          }),
        })),

      updateSettings: (partial) =>
        set((state) => ({ settings: { ...state.settings, ...partial } })),

      startPlayback: (routineId) => {
        const routine = get().routines.find((r) => r.id === routineId);
        if (!routine || routine.movements.length === 0) return;
        const first = routine.movements[0];
        set({
          playback: {
            routineId,
            currentIndex: 0,
            timeLeft: first.duration,
            isPlaying: false,
            isFinished: false,
          },
          view: 'playback',
        });
      },

      setPlayback: (partial) =>
        set((state) => (state.playback ? { playback: { ...state.playback, ...partial } } : {})),

      endPlayback: () => set({ playback: null }),
    }),
    {
      name: 'acrobungee-timer-v1',
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        routines: state.routines,
        movementTemplates: state.movementTemplates,
        settings: state.settings,
      }),
      migrate: (persisted: unknown, fromVersion: number) => {
        const state = persisted as { settings?: Record<string, unknown> } | undefined;
        if (state?.settings && fromVersion < 2) {
          const s = state.settings;
          // Migración: announceMovementName/announceCountdown → announceNextMovement/startCountdownSeconds
          if ('announceMovementName' in s) {
            s.announceNextMovement = s.announceMovementName !== false;
            delete s.announceMovementName;
          } else if (!('announceNextMovement' in s)) {
            s.announceNextMovement = true;
          }
          if ('announceCountdown' in s) {
            s.startCountdownSeconds = s.announceCountdown ? 5 : 0;
            delete s.announceCountdown;
          } else if (!('startCountdownSeconds' in s)) {
            s.startCountdownSeconds = 5;
          }
        }
        // El cast es seguro: la lógica de migración ya dejó la forma esperada.
        return state as unknown as AppStore;
      },
    },
  ),
);
