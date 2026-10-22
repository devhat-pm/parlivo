import type { LanguageCode } from "@parlivo/schemas";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface LobbyChoice {
  audioDeviceId: string | undefined;
  videoDeviceId: string | undefined;
  speakingLanguage: LanguageCode;
  listeningLanguage: LanguageCode;
}

interface LobbyState extends LobbyChoice {
  /** Meeting the choice was confirmed for; the meeting page sends you back to the lobby otherwise. */
  confirmedForMeetingId: string | null;
  confirm: (meetingId: string, choice: LobbyChoice) => void;
}

export const useLobby = create<LobbyState>()(
  persist(
    (set) => ({
      audioDeviceId: undefined,
      videoDeviceId: undefined,
      speakingLanguage: "en",
      listeningLanguage: "en",
      confirmedForMeetingId: null,
      confirm: (meetingId, choice) => set({ ...choice, confirmedForMeetingId: meetingId }),
    }),
    { name: "parlivo-lobby", storage: createJSONStorage(() => sessionStorage) },
  ),
);
