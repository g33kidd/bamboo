import { engine, action, pipe, group } from '../'
import Endpoint from '../src/endpoint/Endpoint'

// ============================================================================
// MIDDLEWARE PIPES
// ============================================================================

// Authentication middleware
const authPipe = pipe('auth', async (endpoint: Endpoint) => {
  const token = endpoint.header('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    return endpoint.status(401, 'Unauthorized')
  }
  
  // Simulate token validation
  if (token !== 'valid-token') {
    return endpoint.status(401, 'Invalid token')
  }
  
  // Store user info in request stash
  endpoint.stash('user', { id: 1, name: 'John Doe' })
  return endpoint
})

// Rate limiting middleware
const rateLimitPipe = pipe('rate-limit', async (endpoint: Endpoint) => {
  const clientIp = endpoint.header('x-forwarded-for') || 'unknown'
  
  // Simple in-memory rate limiting (use Redis in production)
  const key = `rate_limit:${clientIp}`
  const current = (globalThis as any)[key] || 0
  
  if (current > 100) { // 100 requests per minute
    return endpoint.status(429, 'Too Many Requests')
  }
  
  (globalThis as any)[key] = current + 1
  
  // Reset counter after 1 minute
  setTimeout(() => {
    (globalThis as any)[key] = 0
  }, 60000)
  
  return endpoint
})

// ============================================================================
// DATA STORE (In-memory for demo)
// ============================================================================

interface User {
  id: number
  name: string
  email: string
  createdAt: Date
}

interface Post {
  id: number
  title: string
  content: string
  authorId: number
  createdAt: Date
}

const users: User[] = [
  { id: 1, name: 'John Doe', email: 'john@example.com', createdAt: new Date() },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', createdAt: new Date() }
]

const posts: Post[] = [
  { id: 1, title: 'Hello World', content: 'This is my first post', authorId: 1, createdAt: new Date() },
  { id: 2, title: 'Bamboo Framework', content: 'A great framework for Bun.js', authorId: 2, createdAt: new Date() }
]

// ============================================================================
// USER ROUTES
// ============================================================================

const userRoutes = group('/users', [
  // GET /users - List all users
  action('GET /', async (endpoint: Endpoint) => {
    const page = parseInt(endpoint.search('page') || '1')
    const limit = parseInt(endpoint.search('limit') || '10')
    
    const start = (page - 1) * limit
    const end = start + limit
    const paginatedUsers = users.slice(start, end)
    
    return endpoint.json({
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        total: users.length,
        pages: Math.ceil(users.length / limit)
      }
    })
  }),
  
  // GET /users/:id - Get user by ID
  action('GET /:id', async (endpoint: Endpoint) => {
    const id = parseInt(endpoint.param('id') || '0')
    const user = users.find(u => u.id === id)
    
    if (!user) {
      return endpoint.status(404, 'User not found')
    }
    
    return endpoint.json({ user })
  }),
  
  // POST /users - Create new user
  action('POST /', async (endpoint: Endpoint) => {
    const body = await endpoint.all()
    
    if (!body.name || !body.email) {
      return endpoint.status(400, 'Name and email are required')
    }
    
    // Check if email already exists
    if (users.find(u => u.email === body.email)) {
      return endpoint.status(409, 'Email already exists')
    }
    
    const newUser: User = {
      id: users.length + 1,
      name: body.name,
      email: body.email,
      createdAt: new Date()
    }
    
    users.push(newUser)
    
    return endpoint.status(201).json({ user: newUser })
  }),
  
  // PUT /users/:id - Update user
  action('PUT /:id', async (endpoint: Endpoint) => {
    const id = parseInt(endpoint.param('id') || '0')
    const userIndex = users.findIndex(u => u.id === id)
    
    if (userIndex === -1) {
      return endpoint.status(404, 'User not found')
    }
    
    const body = await endpoint.all()
    const updatedUser = { ...users[userIndex], ...body }
    users[userIndex] = updatedUser
    
    return endpoint.json({ user: updatedUser })
  }),
  
  // DELETE /users/:id - Delete user
  action('DELETE /:id', async (endpoint: Endpoint) => {
    const id = parseInt(endpoint.param('id') || '0')
    const userIndex = users.findIndex(u => u.id === id)
    
    if (userIndex === -1) {
      return endpoint.status(404, 'User not found')
    }
    
    users.splice(userIndex, 1)
    
    return endpoint.status(204)
  })
])

// ============================================================================
// POST ROUTES
// ============================================================================

const postRoutes = group('/posts', [
  // GET /posts - List all posts
  action('GET /', async (endpoint: Endpoint) => {
    const authorId = endpoint.search('author')
    let filteredPosts = posts
    
    if (authorId) {
      filteredPosts = posts.filter(p => p.authorId === parseInt(authorId))
    }
    
    return endpoint.json({ posts: filteredPosts })
  }),
  
  // GET /posts/:id - Get post by ID
  action('GET /:id', async (endpoint: Endpoint) => {
    const id = parseInt(endpoint.param('id') || '0')
    const post = posts.find(p => p.id === id)
    
    if (!post) {
      return endpoint.status(404, 'Post not found')
    }
    
    // Include author information
    const author = users.find(u => u.id === post.authorId)
    return endpoint.json({ 
      post: { ...post, author: author ? { id: author.id, name: author.name } : null }
    })
  }),
  
  // POST /posts - Create new post (requires auth)
  action('POST /', async (endpoint: Endpoint) => {
    const body = await endpoint.all()
    const user = endpoint.fromStash('user')
    
    if (!body.title || !body.content) {
      return endpoint.status(400, 'Title and content are required')
    }
    
    const newPost: Post = {
      id: posts.length + 1,
      title: body.title,
      content: body.content,
      authorId: user.id,
      createdAt: new Date()
    }
    
    posts.push(newPost)
    
    return endpoint.status(201).json({ post: newPost })
  }, [authPipe]),
  
  // PUT /posts/:id - Update post (requires auth)
  action('PUT /:id', async (endpoint: Endpoint) => {
    const id = parseInt(endpoint.param('id') || '0')
    const postIndex = posts.findIndex(p => p.id === id)
    const user = endpoint.fromStash('user')
    
    if (postIndex === -1) {
      return endpoint.status(404, 'Post not found')
    }
    
    // Check if user owns the post
    if (posts[postIndex].authorId !== user.id) {
      return endpoint.status(403, 'Forbidden')
    }
    
    const body = await endpoint.all()
    const updatedPost = { ...posts[postIndex], ...body }
    posts[postIndex] = updatedPost
    
    return endpoint.json({ post: updatedPost })
  }, [authPipe]),
  
  // DELETE /posts/:id - Delete post (requires auth)
  action('DELETE /:id', async (endpoint: Endpoint) => {
    const id = parseInt(endpoint.param('id') || '0')
    const postIndex = posts.findIndex(p => p.id === id)
    const user = endpoint.fromStash('user')
    
    if (postIndex === -1) {
      return endpoint.status(404, 'Post not found')
    }
    
    // Check if user owns the post
    if (posts[postIndex].authorId !== user.id) {
      return endpoint.status(403, 'Forbidden')
    }
    
    posts.splice(postIndex, 1)
    
    return endpoint.status(204)
  }, [authPipe])
])

// ============================================================================
// UTILITY ROUTES
// ============================================================================

const utilityRoutes = [
  // Health check
  action('GET /health', async (endpoint: Endpoint) => {
    return endpoint.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    })
  }),
  
  // API info
  action('GET /api', async (endpoint: Endpoint) => {
    return endpoint.json({
      name: 'Bamboo REST API Example',
      version: '1.0.0',
      endpoints: {
        users: '/users',
        posts: '/posts',
        health: '/health'
      }
    })
  }),
  
  // Error handling example
  action('GET /error', async (endpoint: Endpoint) => {
    throw new Error('This is a test error')
  })
]

// ============================================================================
// SERVER CONFIGURATION
// ============================================================================

engine.configure({
  actions: [
    userRoutes,
    postRoutes,
    ...utilityRoutes
  ],
  pipes: [rateLimitPipe]
})

console.log('🚀 REST API Server starting...')
console.log('📖 Available endpoints:')
console.log('  GET  /health - Health check')
console.log('  GET  /api - API information')
console.log('  GET  /users - List users')
console.log('  POST /users - Create user')
console.log('  GET  /users/:id - Get user')
console.log('  PUT  /users/:id - Update user')
console.log('  DELETE /users/:id - Delete user')
console.log('  GET  /posts - List posts')
console.log('  POST /posts - Create post (requires auth)')
console.log('  GET  /posts/:id - Get post')
console.log('  PUT  /posts/:id - Update post (requires auth)')
console.log('  DELETE /posts/:id - Delete post (requires auth)')
console.log('')
console.log('🔑 Use Authorization: Bearer valid-token for protected routes')

engine.serve() 