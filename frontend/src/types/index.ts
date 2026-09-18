export interface Deck {
  id: string;
  userId: string;
  name: string;
  parentId: string | null;
  presetId: string | null;
  description: string;
  createdAt: string;
}

export interface Card {
  id: string;
  noteId: string;
  cardOrdinal: number;
  state: string;
  due: string;
  intervalDays: number;
  easeFactor: number;
  repetitions: number;
  lapses: number;
  learningStep: number;
  suspended: boolean;
  buried: boolean;
  flagColor: string | null;
  leech: boolean;
  createdAt: string;
}

export interface Note {
  id: string;
  userId: string;
  deckId: string;
  noteType: string;
  fieldsJson: string;
  tags: string;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  cardId: string;
  rating: number;
  intervalDays: number;
  easeFactor: number;
  timeTakenMs: number;
  reviewedAt: string;
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  points: number;
  streak: number;
  mascot: string;
  unlockedSkins: string[];
}

export interface AuthResponse {
  token: string;
  user: UserDto;
}

// Auth Requests
export interface RegisterRequest {
  email: string;
  name: string;
  password?: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

// Deck Requests
export interface DeckCreateBody {
  name: string;
  description?: string;
  parentId?: string;
}

export interface DeckUpdateBody {
  name: string;
  description?: string;
}

// Card & Note Requests
export interface NoteCreateBody {
  deckId: string;
  noteType?: string;
  fieldsJson: string;
  tags?: string;
}

export interface NoteUpdateBody {
  fieldsJson: string;
  tags?: string;
}

export interface ImportNoteBody {
  noteType?: string;
  fieldsJson: string;
  tags?: string;
}

export interface ReviewBody {
  rating: number;
  timeTakenMs: number;
}

// DTOs from CardService.DueCardDto
export interface DueCardDto {
  card: Card;
  note: Note;
}

// Template Requests
export interface TemplateDeck {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category?: string;
  cardCount?: number;
}

// Ai Requests/Responses
export interface AiDefinitionResponse {
  definition: string;
}

export interface AiImageResponse {
  imageUrl: string;
}

export interface AiChatResponse {
  response: string;
}

export interface AiChatPayload {
  prompt: string;
  context?: string;
}

export interface AiMassDefinePayload {
  words: string;
}
