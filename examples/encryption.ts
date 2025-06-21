import Bamboo, { sign, verify, random, token, hash, hmac, uuid } from '../src/bamboo'

// Example usage of the Bamboo encryption module

async function encryptionExample() {
    console.log('🔐 Bamboo Encryption Module Examples\n')

    // 1. Generate random values
    console.log('1. Random Values:')
    console.log('   Random (base64):', random())
    console.log('   Random (hex):', random('hex'))
    console.log('   Token:', token())
    console.log('   UUID:', uuid())
    console.log()

    // 2. Sign and verify data
    console.log('2. Sign and Verify:')
    const data = 'Hello, Bamboo!'
    const context = 'example:message'

    try {
        const signedToken = await sign(context, data, 60000) // 1 minute lifetime
        console.log('   Signed token:', signedToken)

        const verification = await verify(context, signedToken)
        console.log('   Verification result:', verification)

        if (verification && verification.valid) {
            console.log('   ✅ Token is valid, data:', verification.data)
        } else {
            console.log('   ❌ Token is invalid or expired')
        }
    } catch (error) {
        console.log('   ❌ Signing failed:', error)
    }
    console.log()

    // 3. Hashing
    console.log('3. Hashing:')
    const message = 'Hello, World!'
    const messageHash = hash(message)
    const messageHashBase64 = hash(message, 'sha256', 'base64')
    console.log('   Original:', message)
    console.log('   SHA256 (hex):', messageHash)
    console.log('   SHA256 (base64):', messageHashBase64)
    console.log()

    // 4. HMAC
    console.log('4. HMAC:')
    const hmacKey = 'secret-key'
    const hmacSignature = hmac(message, hmacKey)
    console.log('   Message:', message)
    console.log('   HMAC-SHA256:', hmacSignature)
    console.log()

    // 5. Using the class directly
    console.log('5. Using Encryption class:')
    const customToken = Bamboo.encryption.token('hex')
    console.log('   Custom token (hex):', customToken)

    const customHash = Bamboo.encryption.hash(message, 'sha512', 'base64')
    console.log('   SHA512 (base64):', customHash)
    console.log()

    // 6. WebSocket token shuffling simulation
    console.log('6. WebSocket Token Shuffling:')
    const originalToken = token()
    console.log('   Original token:', originalToken)

    // Simulate what shuffleToken would do
    const newToken = token()
    const signedWsToken = await sign('websocket:token', newToken, 300000) // 5 minutes
    console.log('   New token:', newToken)
    console.log('   Signed WS token:', signedWsToken)

    const wsVerification = await verify('websocket:token', signedWsToken)
    console.log('   WS token valid:', wsVerification?.valid)
    console.log()
}

// Run the example
encryptionExample().catch(console.error) 