/**
 * Utility functions for serializing database objects to API responses
 * Converts Date objects to ISO strings for JSON serialization
 */

type Primitive = string | number | boolean | null | undefined;
type SerializableValue = Primitive | SerializableObject | SerializableArray;
interface SerializableObject {
  [key: string]: SerializableValue;
}
interface SerializableArray extends Array<SerializableValue> {}

/**
 * Recursively converts all Date objects in an object to ISO strings
 */
export function serializeDates<T>(obj: T): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (obj instanceof Date) {
    return obj.toISOString();
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => serializeDates(item));
  }

  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        serialized[key] = serializeDates(obj[key]);
      }
    }
    return serialized;
  }

  return obj;
}

/**
 * Serializes a single item or array of items from Prisma
 */
export function serialize<T>(data: T): any {
  return serializeDates(data);
}
