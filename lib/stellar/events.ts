const KNOWN_EVENT_TYPES = ["Contribution", "AgreementReleased"] as const;

export type ContractEventType = (typeof KNOWN_EVENT_TYPES)[number];

export interface ContributionEvent {
  id: string;
  cursor: string;
  contractId: string;
  txHash: string;
  ledger: number;
  timestamp: string;
  type: "Contribution";
  contributor: string;
  amount: string;
}

export interface AgreementReleasedEvent {
  id: string;
  cursor: string;
  contractId: string;
  txHash: string;
  ledger: number;
  timestamp: string;
  type: "AgreementReleased";
  amount: string;
  landlord?: string;
}

export type ParsedContractEvent = ContributionEvent | AgreementReleasedEvent;

export interface RpcEventFilter {
  type?: "contract";
  contractIds?: string[];
}

export interface RpcGetEventsRequest {
  startLedger?: number;
  pagination?: {
    cursor?: string;
    limit?: number;
  };
  filters?: RpcEventFilter[];
}

export interface RpcEvent {
  id?: string;
  pagingToken?: string;
  contractId?: string;
  topic?: unknown[];
  value?: unknown;
  txHash?: string;
  ledger?: number;
  ledgerClosedAt?: string;
}

export interface RpcGetEventsResponse {
  events?: RpcEvent[];
  latestLedger?: number;
}

export interface SorobanRpcServer {
  getEvents(request: RpcGetEventsRequest): Promise<RpcGetEventsResponse>;
}

export interface FetchContractEventsOptions {
  server: SorobanRpcServer;
  contractId?: string;
  eventTypes?: ContractEventType[];
  cursor?: string;
  startLedger?: number;
  limit?: number;
}

export interface FetchContractEventsResult {
  events: ParsedContractEvent[];
  latestLedger?: number;
  nextCursor?: string;
}

export interface ContractEventPoller {
  poll(): Promise<FetchContractEventsResult>;
  getCursor(): string | undefined;
}

export async function fetchContractEvents(
  options: FetchContractEventsOptions
): Promise<FetchContractEventsResult> {
  const request: RpcGetEventsRequest = {
    startLedger: options.startLedger,
    pagination: {
      cursor: options.cursor,
      limit: options.limit ?? 100,
    },
    filters: options.contractId
      ? [
          {
            type: "contract",
            contractIds: [options.contractId],
          },
        ]
      : undefined,
  };

  const response = await options.server.getEvents(request);
  const allowedTypes = options.eventTypes
    ? new Set(options.eventTypes)
    : undefined;

  const parsedEvents = (response.events ?? [])
    .map(parseContractEvent)
    .filter((event): event is ParsedContractEvent => event !== null)
    .filter((event) => !options.contractId || event.contractId === options.contractId)
    .filter((event) => !allowedTypes || allowedTypes.has(event.type));

  const lastRawEvent = (response.events ?? [])[response.events?.length ? response.events.length - 1 : -1];

  return {
    events: parsedEvents,
    latestLedger: response.latestLedger,
    nextCursor: lastRawEvent?.pagingToken ?? options.cursor,
  };
}

export function createContractEventPoller(
  options: FetchContractEventsOptions
): ContractEventPoller {
  let cursor = options.cursor;

  return {
    async poll(): Promise<FetchContractEventsResult> {
      const result = await fetchContractEvents({
        ...options,
        cursor,
      });

      cursor = result.nextCursor;
      return result;
    },
    getCursor(): string | undefined {
      return cursor;
    },
  };
}

export function parseContractEvent(rawEvent: RpcEvent): ParsedContractEvent | null {
  const eventType = parseEventType(rawEvent.topic?.[0]);
  if (!eventType) {
    return null;
  }

  const eventBase = {
    id: rawEvent.id ?? "",
    cursor: rawEvent.pagingToken ?? "",
    contractId: rawEvent.contractId ?? "",
    txHash: rawEvent.txHash ?? "",
    ledger: rawEvent.ledger ?? 0,
    timestamp: parseTimestamp(rawEvent.ledgerClosedAt),
  };

  if (!eventBase.contractId) {
    return null;
  }

  if (eventType === "Contribution") {
    const payload = normalizeScVal(rawEvent.value);
    const contributor =
      getRecordString(payload, ["roommate", "contributor", "from", "account", "user"]) ??
      topicAddress(rawEvent.topic, 1);
    const amount =
      getRecordString(payload, ["amount", "share", "value", "funded"]) ??
      scalarToString(payload);

    if (!contributor || !amount) {
      return null;
    }

    return {
      ...eventBase,
      type: "Contribution",
      contributor,
      amount,
    };
  }

  const payload = normalizeScVal(rawEvent.value);
  const amount =
    getRecordString(payload, ["amount", "total", "released", "funded", "value"]) ??
    scalarToString(payload);

  if (!amount) {
    return null;
  }

  const landlord =
    getRecordString(payload, ["landlord", "recipient", "to", "owner"]) ??
    topicAddress(rawEvent.topic, 1);

  return {
    ...eventBase,
    type: "AgreementReleased",
    amount,
    ...(landlord ? { landlord } : {}),
  };
}

function parseTimestamp(value?: string): string {
  if (!value) {
    return new Date(0).toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(0).toISOString();
  }

  return parsed.toISOString();
}

function parseEventType(value: unknown): ContractEventType | null {
  const normalized = normalizeScVal(value);
  if (typeof normalized === "string") {
    return toKnownEventType(normalized);
  }

  return null;
}

function toKnownEventType(value: string): ContractEventType | null {
  if (KNOWN_EVENT_TYPES.includes(value as ContractEventType)) {
    return value as ContractEventType;
  }

  try {
    const decoded = Buffer.from(value, "base64").toString("utf8").replace(/\0/g, "").trim();
    if (KNOWN_EVENT_TYPES.includes(decoded as ContractEventType)) {
      return decoded as ContractEventType;
    }
  } catch {
    return null;
  }

  return null;
}

function topicAddress(topic: unknown[] | undefined, index: number): string | undefined {
  if (!topic || topic.length <= index) {
    return undefined;
  }

  const parsed = normalizeScVal(topic[index]);
  return typeof parsed === "string" ? parsed : undefined;
}

function scalarToString(value: unknown): string | undefined {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }

  return undefined;
}

function getRecordString(
  value: unknown,
  keys: string[]
): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const entry = record[key];
    const scalar = scalarToString(entry);
    if (scalar) {
      return scalar;
    }
  }

  return undefined;
}

function normalizeScVal(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeScVal(entry));
  }

  const objectValue = value as Record<string, unknown>;

  if (typeof objectValue.symbol === "string") {
    return objectValue.symbol;
  }

  if (typeof objectValue.sym === "string") {
    return objectValue.sym;
  }

  if (typeof objectValue.string === "string") {
    return objectValue.string;
  }

  if (typeof objectValue.str === "string") {
    return objectValue.str;
  }

  if (typeof objectValue.address === "string") {
    return objectValue.address;
  }

  if (typeof objectValue.accountId === "string") {
    return objectValue.accountId;
  }

  for (const numericKey of ["i32", "u32", "i64", "u64", "i128", "u128", "i256", "u256"]) {
    const numericValue = objectValue[numericKey];
    if (
      typeof numericValue === "string" ||
      typeof numericValue === "number" ||
      typeof numericValue === "bigint"
    ) {
      return String(numericValue);
    }
  }

  if (Array.isArray(objectValue.vec)) {
    return objectValue.vec.map((entry) => normalizeScVal(entry));
  }

  if (Array.isArray(objectValue.map)) {
    const mappedRecord: Record<string, unknown> = {};

    for (const entry of objectValue.map) {
      if (!entry || typeof entry !== "object") {
        continue;
      }

      const pair = entry as Record<string, unknown>;
      const mappedKey = normalizeScVal(pair.key);
      const mappedValue = normalizeScVal(
        pair.val ?? pair.value ?? pair.entry ?? pair.data
      );

      if (typeof mappedKey === "string") {
        mappedRecord[mappedKey] = mappedValue;
      }
    }

    return mappedRecord;
  }

  if (objectValue.value !== undefined) {
    return normalizeScVal(objectValue.value);
  }

  return objectValue;
}
