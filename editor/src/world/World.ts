import type { Vec2, Box } from './types';

export class World {
  boxes: Box[] = [];
  nextId = 1;

  addBox(pos: Vec2, size: Vec2) {
    this.boxes.push({ id: this.nextId++, pos, size });
  }
}
