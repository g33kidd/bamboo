// import { engine, action, pipe } from '../'
// import { createClient } from 'redis'
// import RateLimitCache from '../src/extensions/ratelimit'
// import Endpoint from '../src/endpoint/Endpoint'

// // ============================================================================
// // REDIS SETUP
// // ============================================================================

// // Create Redis client
// const redis = createClient({
//     url: process.env.REDIS_URL || 'redis://localhost:6379'
// })

// // Connect to Redis
// redis.on('error', (err) => {
//     console.error('Redis Client Error:', err)
// })

// redis.on('connect', () => {
//     console.log('✅ Connected to Redis')
// })

// // ============================================================================
// // RATE LIMITING WITH REDIS
// // ============================================================================

// // Create Redis-based rate limit cache
// const rateLimitCache = RateLimitCache.createRedisCache(redis, 'api:rate_limit:')

// // Configure engine to use Redis rate limiting
// engine.limiterCache = rateLimitCache

// // ============================================================================
// // EXAMPLE ACTIONS
// // ============================================================================

// // Example 1: API rate limiting with Redis persistence
// const apiAction = action('GET /api/data', async (endpoint: Endpoint) => {
//     // Rate limit: 10 requests per minute per IP
//     const isRateLimited = await endpoint.ratelimit('api:data', 10, 60000)

//     if (isRateLimited) {
//         const info = await endpoint.getRateLimitInfo('api:data')
//         return endpoint.status(429).json({
//             error: 'rate_limit_exceeded',
//             message: 'Too many requests. Please try again later.',
//             retryAfter: Math.ceil((info?.resetTime || 60000) / 1000),
//             limit: info?.limit,
//             remaining: info?.remaining,
//         })
//     }

//     return endpoint.json({
//         message: 'Data retrieved successfully',
//         timestamp: new Date().toISOString(),
//         remaining: (await endpoint.getRateLimitInfo('api:data'))?.remaining || 0,
//     })
// })

// // Example 2: User-specific rate limiting
// const userAction = action('POST /api/user/action', async (endpoint: Endpoint) => {
//     const userId = endpoint.header('X-User-ID')

//     if (!userId) {
//         return endpoint.status(401).json({
//             error: 'unauthorized',
//             message: 'User ID is required.',
//         })
//     }

//     // Rate limit: 5 actions per hour per user
//     const context = `user:action:${userId}`
//     const isRateLimited = await endpoint.ratelimit(context, 5, 3600000) // 1 hour

//     if (isRateLimited) {
//         const info = await endpoint.getRateLimitInfo(context)
//         return endpoint.status(429).json({
//             error: 'rate_limit_exceeded',
//             message: 'User action limit exceeded. Please try again later.',
//             retryAfter: Math.ceil((info?.resetTime || 3600000) / 1000),
//             limit: info?.limit,
//             remaining: info?.remaining,
//         })
//     }

//     return endpoint.json({
//         message: 'User action completed successfully',
//         userId,
//         timestamp: new Date().toISOString(),
//         remaining: (await endpoint.getRateLimitInfo(context))?.remaining || 0,
//     })
// })

// // Example 3: Global rate limiting middleware
// const globalRateLimitPipe = pipe('global-rate-limit', async (endpoint: Endpoint) => {
//     const path = endpoint.url.pathname

//     // Different rate limits for different endpoints
//     let context: string
//     let limit: number
//     let interval: number

//     if (path.startsWith('/api/admin')) {
//         context = 'global:admin'
//         limit = 30
//         interval = 60000 // 30 requests per minute
//     } else if (path.startsWith('/api/public')) {
//         context = 'global:public'
//         limit = 100
//         interval = 60000 // 100 requests per minute
//     } else {
//         context = 'global:default'
//         limit = 60
//         interval = 60000 // 60 requests per minute
//     }

//     const isRateLimited = await endpoint.ratelimit(context, limit, interval)

//     if (isRateLimited) {
//         const info = await endpoint.getRateLimitInfo(context)
//         return endpoint.status(429).json({
//             error: 'rate_limit_exceeded',
//             message: 'Global rate limit exceeded. Please try again later.',
//             retryAfter: Math.ceil((info?.resetTime || interval) / 1000),
//             limit: info?.limit,
//             remaining: info?.remaining,
//         })
//     }

//     // Add rate limit headers to response
//     const info = await endpoint.getRateLimitInfo(context)
//     endpoint.header('X-RateLimit-Limit', info?.limit?.toString() || '0')
//     endpoint.header('X-RateLimit-Remaining', info?.remaining?.toString() || '0')
//     endpoint.header('X-RateLimit-Reset', Math.ceil((info?.resetTime || 0) / 1000).toString())

//     return endpoint
// })

// // ============================================================================
// // SERVER CONFIGURATION
// // ============================================================================

// async function startServer() {
//     try {
//         // Connect to Redis
//         await redis.connect()
//         console.log('✅ Redis connected successfully')

//         // Configure engine
//         engine.configure({
//             actions: [
//                 apiAction,
//                 userAction,
//             ],
//             pipes: [globalRateLimitPipe]
//         })

//         // Start server
//         engine.serve()
//         console.log('🚀 Server started with Redis rate limiting')
//         console.log('📊 Rate limiting data will persist across server restarts')

//     } catch (error) {
//         console.error('❌ Failed to start server:', error)
//         process.exit(1)
//     }
// }

// // ============================================================================
// // GRACEFUL SHUTDOWN
// // ============================================================================

// process.on('SIGINT', async () => {
//     console.log('\n🛑 Shutting down gracefully...')
//     await redis.quit()
//     console.log('✅ Redis disconnected')
//     process.exit(0)
// })

// // ============================================================================
// // START SERVER
// // ============================================================================

// startServer()

// // ============================================================================
// // USAGE EXAMPLES
// // ============================================================================

// console.log('\n📖 Redis Rate Limiting Examples:')
// console.log('1. API rate limiting: GET /api/data')
// console.log('2. User-specific rate limiting: POST /api/user/action')
// console.log('3. Global rate limiting: Any /api/* endpoint')
// console.log('')
// console.log('🔧 Test with curl:')
// console.log('curl http://localhost:3000/api/data')
// console.log('curl -X POST http://localhost:3000/api/user/action -H "X-User-ID: 123"')
// console.log('')
// console.log('💡 Benefits of Redis rate limiting:')
// console.log('- Data persists across server restarts')
// console.log('- Works in distributed/multi-instance environments')
// console.log('- Automatic expiration of old rate limit data')
// console.log('- Better performance for high-traffic applications') 