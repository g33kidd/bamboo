import { join } from 'path'

export default class Bamboo {
  static sign(ctx: string, data: string, lifetime?: number) {}

  static verify(ctx: string, data: string, lifetime?: number) {}

  // NOTE: I don't remember what this was for? Must not be that important
  // static async file() {
  //   const defaults = {
  //     pids: [],
  //   }
  // }
}
