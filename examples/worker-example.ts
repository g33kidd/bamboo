import { engine } from '../'

// ============================================================================
// WORKER EXAMPLES
// ============================================================================

// Example 1: Image Processing Worker
const imageWorker = engine.createWorker('image-processor', './workers/image-processor.ts')

// Example 2: Data Analysis Worker  
const analysisWorker = engine.createWorker('data-analysis', './workers/data-analysis.ts')

// Example 3: Email Sending Worker
const emailWorker = engine.createWorker('email-sender', './workers/email-sender.ts')

// Example 4: Report Generation Worker
const reportWorker = engine.createWorker('report-generator', './workers/report-generator.ts')

// ============================================================================
// USING WORKERS
// ============================================================================

// Send a message to a worker
engine.sendToWorker('image-processor', {
  type: 'resize',
  image: 'base64-image-data',
  width: 800,
  height: 600
})

// Get a worker instance
const worker = engine.getWorker('image-processor')

// Terminate a specific worker
engine.terminateWorker('email-sender')

// Terminate all workers (useful for graceful shutdown)
engine.terminateAllWorkers()

// ============================================================================
// WORKER SCRIPT EXAMPLES
// ============================================================================

/*
// workers/image-processor.ts
self.onmessage = (event) => {
  const { type, image, width, height } = event.data
  
  switch (type) {
    case 'resize':
      // Process image resizing
      const resizedImage = resizeImage(image, width, height)
      self.postMessage({ 
        type: 'resize_complete', 
        result: resizedImage 
      })
      break
      
    case 'compress':
      // Process image compression
      const compressedImage = compressImage(image)
      self.postMessage({ 
        type: 'compress_complete', 
        result: compressedImage 
      })
      break
  }
}

function resizeImage(image: string, width: number, height: number) {
  // Image processing logic here
  return 'resized-image-data'
}

function compressImage(image: string) {
  // Compression logic here
  return 'compressed-image-data'
}
*/

/*
// workers/email-sender.ts
self.onmessage = (event) => {
  const { to, subject, body } = event.data
  
  // Send email logic here
  sendEmail(to, subject, body)
  
  self.postMessage({ 
    type: 'email_sent', 
    to, 
    success: true 
  })
}

function sendEmail(to: string, subject: string, body: string) {
  // Email sending implementation
}
*/

/*
// workers/data-analysis.ts
self.onmessage = (event) => {
  const { data, analysisType } = event.data
  
  let result
  switch (analysisType) {
    case 'statistics':
      result = calculateStatistics(data)
      break
    case 'trends':
      result = analyzeTrends(data)
      break
    case 'predictions':
      result = generatePredictions(data)
      break
  }
  
  self.postMessage({ 
    type: 'analysis_complete', 
    result 
  })
}
*/ 