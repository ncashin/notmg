export class Vector2 {
  public x: number;
  public y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  // Static factory methods
  static zero(): Vector2 {
    return new Vector2(0, 0);
  }

  static one(): Vector2 {
    return new Vector2(1, 1);
  }

  static from(obj: { x: number; y: number }): Vector2 {
    return new Vector2(obj.x, obj.y);
  }

  static fromPolar(angle: number, magnitude: number = 1): Vector2 {
    return new Vector2(Math.cos(angle) * magnitude, Math.sin(angle) * magnitude);
  }

  // Check if an object should be a Vector2 and reconstruct it
  static reconstructFromObject(obj: any): any {
    if (obj && typeof obj === 'object') {
      // Check if this looks like a Vector2 (has x, y and either _isVector2 flag or Vector2-like structure)
      if (obj._isVector2 || (
        typeof obj.x === 'number' && 
        typeof obj.y === 'number' && 
        Object.keys(obj).length === 2
      )) {
        return new Vector2(obj.x, obj.y);
      }
      
      // Recursively reconstruct nested objects
      if (Array.isArray(obj)) {
        return obj.map(item => Vector2.reconstructFromObject(item));
      }
      
      const reconstructed: any = {};
      for (const [key, value] of Object.entries(obj)) {
        reconstructed[key] = Vector2.reconstructFromObject(value);
      }
      return reconstructed;
    }
    
    return obj;
  }

  // Basic operations
  add(other: Vector2): Vector2 {
    return new Vector2(this.x + other.x, this.y + other.y);
  }

  subtract(other: Vector2): Vector2 {
    return new Vector2(this.x - other.x, this.y - other.y);
  }

  multiply(scalar: number): Vector2 {
    return new Vector2(this.x * scalar, this.y * scalar);
  }

  divide(scalar: number): Vector2 {
    return new Vector2(this.x / scalar, this.y / scalar);
  }

  // Mutating operations
  addMut(other: Vector2): Vector2 {
    this.x += other.x;
    this.y += other.y;
    return this;
  }

  subtractMut(other: Vector2): Vector2 {
    this.x -= other.x;
    this.y -= other.y;
    return this;
  }

  multiplyMut(scalar: number): Vector2 {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  divideMut(scalar: number): Vector2 {
    this.x /= scalar;
    this.y /= scalar;
    return this;
  }

  // Vector properties
  magnitude(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  magnitudeSquared(): number {
    return this.x * this.x + this.y * this.y;
  }

  normalized(): Vector2 {
    const mag = this.magnitude();
    if (mag === 0) return Vector2.zero();
    return this.divide(mag);
  }

  normalizeMut(): Vector2 {
    const mag = this.magnitude();
    if (mag === 0) {
      this.x = 0;
      this.y = 0;
    } else {
      this.x /= mag;
      this.y /= mag;
    }
    return this;
  }

  // Vector math
  dot(other: Vector2): number {
    return this.x * other.x + this.y * other.y;
  }

  cross(other: Vector2): number {
    return this.x * other.y - this.y * other.x;
  }

  distance(other: Vector2): number {
    return this.subtract(other).magnitude();
  }

  distanceSquared(other: Vector2): number {
    return this.subtract(other).magnitudeSquared();
  }

  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  angleTo(other: Vector2): number {
    return Math.atan2(other.y - this.y, other.x - this.x);
  }

  // Utility methods
  clone(): Vector2 {
    return new Vector2(this.x, this.y);
  }

  equals(other: Vector2, tolerance: number = Number.EPSILON): boolean {
    return Math.abs(this.x - other.x) < tolerance && Math.abs(this.y - other.y) < tolerance;
  }

  set(x: number, y: number): Vector2 {
    this.x = x;
    this.y = y;
    return this;
  }

  setFrom(other: Vector2): Vector2 {
    this.x = other.x;
    this.y = other.y;
    return this;
  }

  lerp(other: Vector2, t: number): Vector2 {
    return new Vector2(
      this.x + (other.x - this.x) * t,
      this.y + (other.y - this.y) * t
    );
  }

  lerpMut(other: Vector2, t: number): Vector2 {
    this.x += (other.x - this.x) * t;
    this.y += (other.y - this.y) * t;
    return this;
  }

  // Serialization
  toObject(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  toString(): string {
    return `Vector2(${this.x}, ${this.y})`;
  }

  toArray(): [number, number] {
    return [this.x, this.y];
  }

  // Mark for serialization
  toJSON(): { x: number; y: number; _isVector2: true } {
    return { x: this.x, y: this.y, _isVector2: true };
  }
}

// Helper function for deep cloning with Vector2 preservation
export function cloneWithVector2(obj: any): any {
  if (obj instanceof Vector2) {
    return obj.clone();
  }
  
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => cloneWithVector2(item));
  }
  
  const cloned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    cloned[key] = cloneWithVector2(value);
  }
  
  return cloned;
} 