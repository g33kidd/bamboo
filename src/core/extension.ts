/**
 * Extensions are essentially micro-applications that add functionality to
 * either the engine itself or the application using the engine.
 *
 * Requirements:
 *
 * - Ability to call start/stop methods on an extension.
 * - Register new routes within the engine.
 *
 *
 * Thoughts:
 *
 * An extension should have the ability to be dynamic. In the sense that it should
 * be able to modify itself. So here's an example:
 *
 *    There's an enterprise client that needs a specific set of functionality
 *    that allows an AI to create modules based on the needs of its clients.
 *
 *    The AI should have the ability to modify the extension on-the-fly and
 *    showcase its progress as it's being developed. So it should be able to create
 *    routes under the extension without modifying the main codebase of the program
 *    that it is working under.
 */

import { Action, ActionGroup, engine, group } from '../..'

// interface Extension {
//   name: string
//   enabled: boolean
// }

class Extension {
  name: string = 'extension'
  enabled: boolean = true

  constructor(name: string) {
    this.name = name
  }

  /**
   * Since an extension is dnyamic it should have the ability
   * to enable/disable.
   */
  disable = () => (this.enabled = false)
  enable = () => (this.enabled = true)

  /**
   * Used for the initial setup and configuration of the extension.
   */
  async initialize() {}

  /**
   * If the extension needs to be started/stopped. Like for a
   * long-running service like a discord bot.
   */
  async start() {}
  async stop() {}

  /**
   * Lifecycle functions
   */
  async remove() {}

  /**
   * Allows an extension to have its own set of http or realtime actions.
   *
   * Useful for third-party software or stuff created by AI as it only has to worry
   * about the context of the extension and nothing else.
   *
   * TODO: More work on this.
   */
  addActions(actions: (Action | ActionGroup)[]) {
    engine.addActions(actions)
  }
}

export default Extension
