import { engine, action, pipe, group } from '../'
import Endpoint from '../src/endpoint/Endpoint'

// ============================================================================
// RATE LIMITING EXAMPLES
// ============================================================================

// Example 1: Basic rate limiting with custom intervals
const rateLimitedAction = action('GET /api/rate-limited', async (endpoint: Endpoint) => {
    // Rate limit: 5 requests per 10 seconds
    const isRateLimited = endpoint.ratelimit('api:basic', 5, 10000)

    if (isRateLimited) {
        return endpoint.status(429).json({
            error: 'rate_limit_exceeded',
            message: 'Too many requests. Please try again later.',
            retryAfter: 10,
        })
    }

    return endpoint.json({
        message: 'Success!',
        timestamp: new Date().toISOString(),
        remaining: endpoint.getRateLimitInfo('api:basic')?.remaining || 0,
    })
})

// Example 2: IP-based rate limiting
const ipRateLimitedAction = action('POST /api/login', async (endpoint: Endpoint) => {
    // Rate limit: 3 login attempts per minute per IP
    const isRateLimited = endpoint.ratelimit('auth:login', 3, 60000)

    if (isRateLimited) {
        const info = endpoint.getRateLimitInfo('auth:login')
        return endpoint.status(429).json({
            error: 'rate_limit_exceeded',
            message: 'Too many login attempts. Please try again later.',
            retryAfter: Math.ceil((info?.resetTime || 60000) / 1000),
        })
    }

    // Simulate login logic
    const { email, password } = endpoint.body

    if (!email || !password) {
        return endpoint.status(400).json({
            error: 'missing_credentials',
            message: 'Email and password are required.',
        })
    }

    return endpoint.json({
        message: 'Login successful',
        timestamp: new Date().toISOString(),
    })
})

// Example 3: Different rate limits for different user tiers
const tieredRateLimitAction = action('GET /api/premium', async (endpoint: Endpoint) => {
    const userTier = endpoint.header('X-User-Tier') || 'free'
    const userId = endpoint.header('X-User-ID')

    if (!userId) {
        return endpoint.status(401).json({
            error: 'unauthorized',
            message: 'User ID is required.',
        })
    }

    // Different rate limits based on user tier
    let limit: number
    let interval: number

    switch (userTier) {
        case 'premium':
            limit = 100
            interval = 60000 // 100 requests per minute
            break
        case 'pro':
            limit = 50
            interval = 60000 // 50 requests per minute
            break
        default: // free
            limit = 10
            interval = 60000 // 10 requests per minute
            break
    }

    const context = `api:premium:${userTier}:${userId}`
    const isRateLimited = endpoint.ratelimit(context, limit, interval)

    if (isRateLimited) {
        const info = endpoint.getRateLimitInfo(context)
        return endpoint.status(429).json({
            error: 'rate_limit_exceeded',
            message: `Rate limit exceeded for ${userTier} tier.`,
            retryAfter: Math.ceil((info?.resetTime || interval) / 1000),
            tier: userTier,
            limit: info?.limit,
            remaining: info?.remaining,
        })
    }

    return endpoint.json({
        message: 'Premium content accessed successfully',
        tier: userTier,
        timestamp: new Date().toISOString(),
        remaining: endpoint.getRateLimitInfo(context)?.remaining || 0,
    })
})

// Example 4: Rate limiting middleware pipe
const rateLimitPipe = pipe('rate-limit', async (endpoint: Endpoint) => {
    const path = endpoint.url.pathname
    const method = endpoint.request.method

    // Different rate limits for different endpoints
    let context: string
    let limit: number
    let interval: number

    if (path.startsWith('/api/admin')) {
        context = 'api:admin'
        limit = 30
        interval = 60000 // 30 requests per minute
    } else if (path.startsWith('/api/public')) {
        context = 'api:public'
        limit = 100
        interval = 60000 // 100 requests per minute
    } else {
        context = 'api:default'
        limit = 60
        interval = 60000 // 60 requests per minute
    }

    const isRateLimited = endpoint.ratelimit(context, limit, interval)

    if (isRateLimited) {
        const info = endpoint.getRateLimitInfo(context)
        return endpoint.status(429).json({
            error: 'rate_limit_exceeded',
            message: 'Rate limit exceeded. Please try again later.',
            retryAfter: Math.ceil((info?.resetTime || interval) / 1000),
            limit: info?.limit,
            remaining: info?.remaining,
        })
    }

    // Add rate limit headers to response
    const info = endpoint.getRateLimitInfo(context)
    endpoint.header('X-RateLimit-Limit', info?.limit?.toString() || '0')
    endpoint.header('X-RateLimit-Remaining', info?.remaining?.toString() || '0')
    endpoint.header('X-RateLimit-Reset', Math.ceil((info?.resetTime || 0) / 1000).toString())

    return endpoint
})

// ============================================================================
// SERVER CONFIGURATION
// ============================================================================

engine.configure({
    actions: [
        rateLimitedAction,
        ipRateLimitedAction,
        tieredRateLimitAction,
    ],
    pipes: [rateLimitPipe]
})

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

console.log('Rate Limiting Examples:')
console.log('1. Basic rate limiting: GET /api/rate-limited')
console.log('2. IP-based rate limiting: POST /api/login')
console.log('3. Tiered rate limiting: GET /api/premium')
console.log('4. Middleware rate limiting: Any /api/* endpoint')

console.log('\nTest with curl:')
console.log('curl http://localhost:3000/api/rate-limited')
console.log('curl -X POST http://localhost:3000/api/login -H "Content-Type: application/json" -d \'{"email":"test@example.com","password":"password"}\'')
console.log('curl http://localhost:3000/api/premium -H "X-User-Tier: premium" -H "X-User-ID: 123"') 