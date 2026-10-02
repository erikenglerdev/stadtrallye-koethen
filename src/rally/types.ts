export type HintPart = {text: string; bold?: boolean; underline?: boolean};
export type HintImage = {src: string; alt: string; width: number; height: number};
export type Station = { id: string; number: number; name: string; lat: number; lng: number; radiusMeters: number; hint: string; hintParts?: HintPart[]; hintImage?: HintImage; hintLayout?: 'verse' };
export type Sample = { lat: number; lng: number; accuracy: number; timestamp: number };
export type ChatMessage = {id: number; sender: 'team' | 'organizer'; body: string; createdAt: number};
export type HelpRequest = {teamId: number; code: string; teamName: string; lastMessage: string; lastMessageAt: number; lastSender: ChatMessage['sender']; messageCount: number};
export type Run = { id: string; routeVersion: string; startIndex: number; confirmed: number; startedAt: number | null; finishedAt: number | null; challenge: string | null; challengeAt: number | null };
export type RallyView = {
  simulationTrack?: {lat: number; lng: number}[];
  simulationTarget?: {number: number; name: string; lat: number; lng: number} | null;
  title: string; total: number; serverNow: number;
  run: null | { code: string | null; teamName: string | null; status: 'ready' | 'running' | 'finished'; startNumber: number; startName: string; confirmed: number; startedAt: number | null; finishedAt: number | null; elapsedMs: number; penaltyMs: number; revealedTarget: {number: number; name: string; lat: number; lng: number} | null; hint: string; hintParts?: HintPart[]; hintImage?: HintImage; hintLayout?: 'verse'; returning: boolean };
};

export type DashboardView = {serverNow: number; teams: {id: number; code: string; teamName: string; status: 'ready' | 'running' | 'finished' | 'abandoned' | 'outdated'; startedAt: number | null; finishedAt: number | null; penaltyMs: number; elapsedMs: number}[]; helpRequests: HelpRequest[]};
