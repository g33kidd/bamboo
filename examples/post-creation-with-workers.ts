import { engine } from '../'
import { action } from '../src/actions/action'
import Endpoint from '../src/endpoint/Endpoint'

// ============================================================================
// WORKER SETUP
// ============================================================================

// Create image processing worker on startup
const imageWorker = engine.createWorker('image-processor', './workers/image-processor.ts')

// Handle responses from the image worker
imageWorker.onmessage = (event: MessageEvent) => {
  const { type, postId, result, error } = event.data
  
  switch (type) {
    case 'image_processed':
      handleImageProcessed(postId, result)
      break
    case 'image_failed':
      handleImageFailed(postId, error)
      break
  }
}

// ============================================================================
// POST CREATION ACTION
// ============================================================================

export default action('POST /posts/create', async (endpoint: Endpoint) => {
  const body = await endpoint.request.json()
  const { text, image, userId } = body
  
  // Validate input
  if (!text) {
    return endpoint.json({ error: 'Text is required' }, 400)
  }
  
  try {
    // 1. Create the post immediately (fast response)
    const post = await createPost({
      text,
      userId,
      imageUrl: image ? 'processing...' : null,
      status: image ? 'processing' : 'published'
    })
    
    // 2. If there's an image, process it in the background
    if (image) {
      // Send image to worker for processing
      engine.sendToWorker('image-processor', {
        type: 'process_post_image',
        postId: post.id,
        image: image, // base64 or file data
        userId: userId,
        formats: ['thumbnail', 'preview', 'full']
      })
      
      // Return immediately with processing status
      return endpoint.json({
        post,
        message: 'Post created! Image is being processed in the background.',
        status: 'processing'
      })
    }
    
    // 3. No image, return immediately
    return endpoint.json({
      post,
      message: 'Post created successfully!',
      status: 'published'
    })
    
  } catch (error) {
    engine.logging.error('Failed to create post:', error)
    return endpoint.json({ error: 'Failed to create post' }, 500)
  }
})

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function createPost(data: {
  text: string
  userId: string
  imageUrl?: string | null
  status: 'processing' | 'published'
}) {
  // Database operation to create post
  // This would be your actual database call
  return {
    id: `post_${Date.now()}`,
    text: data.text,
    userId: data.userId,
    imageUrl: data.imageUrl,
    status: data.status,
    createdAt: new Date().toISOString()
  }
}

async function handleImageProcessed(postId: string, result: any) {
  try {
    // Update post with processed image URLs
    await updatePost(postId, {
      imageUrl: result.full,
      thumbnailUrl: result.thumbnail,
      previewUrl: result.preview,
      status: 'published'
    })
    
    // Notify user via WebSocket or push notification
    engine.logging.info(`Image processed for post ${postId}`)
    
    // You could also broadcast to WebSocket clients
    // engine.realtime.broadcast(`post:${postId}`, 'image_ready', result)
    
  } catch (error) {
    engine.logging.error(`Failed to update post ${postId}:`, error)
  }
}

async function handleImageFailed(postId: string, error: string) {
  try {
    // Update post status to failed
    await updatePost(postId, {
      status: 'failed',
      error: error
    })
    
    engine.logging.error(`Image processing failed for post ${postId}:`, error)
    
  } catch (updateError) {
    engine.logging.error(`Failed to update failed post ${postId}:`, updateError)
  }
}

async function updatePost(postId: string, data: any) {
  // Database operation to update post
  // This would be your actual database call
  engine.logging.info(`Updating post ${postId}:`, data)
} 