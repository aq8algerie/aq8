type FirestoreDateLike = {
  toDate: () => Date;
};

function isFirestoreDateLike(value: object): value is FirestoreDateLike {
  return "toDate" in value && typeof value.toDate === "function";
}

export function toPlainFirestoreData<T>(value: T): T {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString() as T;
  }

  if (Array.isArray(value)) {
    return value
      .map(item => toPlainFirestoreData(item))
      .filter(item => item !== undefined) as T;
  }

  if (typeof value === "object") {
    if (isFirestoreDateLike(value)) {
      return value.toDate().toISOString() as T;
    }

    const plain: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      const normalizedValue = toPlainFirestoreData(nestedValue);
      if (normalizedValue !== undefined) {
        plain[key] = normalizedValue;
      }
    }
    return plain as T;
  }

  return undefined as T;
}
