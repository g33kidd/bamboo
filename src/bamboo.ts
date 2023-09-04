import { join } from "path";

export default class Bamboo {
  static sign(ctx: string, data: string, lifetime?: number) {}

  static verify(ctx: string, data: string, lifetime?: number) {}

  static async file() {
    const defaults = {
      pids: [],
    };
  }
}
