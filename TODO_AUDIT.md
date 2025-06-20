# Bamboo TODO & Incomplete Implementation Audit

This document compiles all TODOs, NOTES, and unfinished/incomplete sections found in the `bamboo/src/` directory. Use this as a reference for technical debt, refactoring, and future development.

---

## General TODOs, NOTES, and Unfinished Sections

### `bamboo/src/storage/index.ts`
- **TODO:** Create methods for deleting entire files or even chunks of files.
- **TODO:** Create a method for creating directories.
- **NOTE:** This should be the same as the implementation in nyra.
- **TODO:** This should probably support subdirectories and such in the future.
- **TODO:** Saving chunks.

### `bamboo/src/endpoint/Endpoint.ts`
- **TODO:** Sign the token with a server-side secret so we can ensure that it's valid later on. (in `createSecureToken`)
- **NOTE:** This can be replaced by Bamboo.createSecureToken.
- **TODO:** create a different method for search params (in `param`)
- **TODO:** Compression. Look into some algorithms or libraries to handle this. (in `file`)
- **notImplemented()**: Method exists to return a "Not Implemented" response, indicating some endpoints may be stubs.

### `bamboo/src/endpoint/WebSocketEndpoint.ts`
- **TODO:** Improve this functionality. Ideally, it should allow for data to be listened to. (in `push`)
- **TODO:** Create an entire token generator within the Engine that can sign/verify and invalidate tokens.
- **Unfinished:** `shuffleToken()` is commented out and not implemented.
- **TODO:** Move functions like this into a base class that can be used by Endpoint and WebSocketEndpoint.
- **TODO:** Confirm that this IP address isn't blacklisted or anything. (in `ratelimit`)
- **TODO:** Refactor this. Why? (in `send`)
- **NOTE:** I still don't remember why I need to refactor this at all.
- **NOTE:** still don't remember why, but keep checking back :)
- **TODO:** Create a general 'lobby' for the client so we don't have a bunch of random websocket channels laying around.

### `bamboo/src/helpers/action.ts`
- **TODO:** Extract parameter parsing to here.
- **Unfinished:** `parseParameters()` is an empty function.

### `bamboo/src/extensions/ratelimit.ts`
- **NOTE:** Start with in-memory cache first, add adapters later.
- **TODO:** Move this to core/limiter.
- **NOTE/TODO:** Instead of what's going on down there, create a cache adapter that supports different storage mechanisms.
- **TODO:** Implement metadata (in `RateLimitLog`).
- **TODO:** Create a base class based on this implementation of the cache, then create other adapters.
- **TODO:** Add this path resolution somewhere else. (in `loadFromCacheFile` and `saveCacheFile`)

### `bamboo/src/engine/index.ts`
- **TODO:** This still needs some work in order to properly load the actions. (in `configure`)
- **TODO:** Load configuration from these directories, import them and utilize them during Engine setup.
- **TODO:** Figure out a suitable folder structure for Bamboo.
- **TODO:** Don't run anything if the response is locked. This requires an explicit call to lock(). (in `serve` websocket message handler)
- **TODO:** Finish rooms implementation. (in `handleWebSocketAction`)
- **TODO:** Finish this, include the timestamp of the first request & most recent request to determine if the limit should be reset, keep counting, or deny requests. (in `ratelimit`)
- **TODO:** There should be rate cache adapter that handles different types of storage for rate limits.

### `bamboo/src/devserver.ts`
- **TODO:** Finish the devserver implementation.
- **Unfinished:** The `fetch` and `message` handlers throw "Function not implemented."
- **NOTE:** Work in progress project.
- **TODO:** Run this to a ws server for the dashboard. (in stream reading loop)

### `bamboo/src/core/extension.ts`
- **TODO:** More work on this. (in `addActions`)
- **NOTE:** Several comments about dynamic extension design, but the implementation is minimal.

### `bamboo/src/actions/websocketAction.ts`
- **TODO:** Move this into core/
- **TODO:** Logging: Replace this with logging. (in `handlePipes`)

### `bamboo/src/actions/action.ts`
- **TODO:** This stuff should be moved into core/actions.
- **TODO:** Currently matches things like **.php|**.xml. Make it so it can match any start/end, so: **-test|**-test.p|test-**. (in constructor)
- **TODO:** Helper functions for declaring routes.
- **TODO:** actionGuard needs to be implemented.

### `bamboo/src/endpoint/BaseEndpoint.ts`
- **TODO:** Engine logging (in `debug`)

### `bamboo/src/core/logging.ts`
- **TODO:** Support more adapters.

### `bamboo/src/actions/registry.ts`
- **TODO:** This should be moved into core/ as well.

---

## Unfinished/Incomplete Implementations

- **Empty or stub functions:**  
  - `createStorageObject()` in `storage/index.ts`
  - `parseParameters()` in `helpers/action.ts`
  - Lifecycle methods in `core/extension.ts` (`initialize`, `start`, `stop`, `remove`) are empty.
- **Commented-out or placeholder code:**  
  - `shuffleToken()` in `WebSocketEndpoint.ts` is commented out.
  - Several places in `engine/index.ts` and `devserver.ts` have placeholder or commented-out code for future features.
- **"Not Implemented" stubs:**  
  - `notImplemented()` in `Endpoint.ts`
  - `fetch` and `message` handlers in `devserver.ts` throw "Function not implemented."
- **Work in progress:**  
  - `devserver.ts` is explicitly marked as a work in progress.
  - Several TODOs in `engine/index.ts` and `extensions/ratelimit.ts` indicate planned but incomplete features (e.g., adapters, room support, configuration loading, etc.).

---

If you want a more detailed breakdown for any specific file or want to see the actual code snippets for each TODO/unfinished section, let me know! 