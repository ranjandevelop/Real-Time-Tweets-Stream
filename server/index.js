const http = require('http')
const path = require('path')

const express = require('express')
const needle = require('needle')
const config = require('dotenv').config()
const socketIO = require('socket.io')

// PORT
const PORT = process.env.PORT || 3000

// ACCESS TOKEN
const TOKEN = process.env.TWITTER_BEARER_TOKEN

// init Express
const app = express();
// Create server
const server = http.createServer(app)
// Conncet server to socket.io
const io = socketIO(server)

// route
app.get('/', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../', 'client', 'index.html'))
})

// URL
const rulesURL = 'https://api.twitter.com/2/tweets/search/stream/rules'
const streamURL =
    'https://api.twitter.com/2/tweets/search/stream?tweet.fields=public_metrics&expansions=author_id'

// Rules (we can add value)
const rules = [{value: 'programming'}]

// Get Stream Rules
async function getRules() {
    const response = await needle('get', rulesURL, {
        headers: {
            Authorization: `Bearer ${TOKEN}`,
        },
    })
    console.log(response.body)
    return response.body
}


// Set Stream Rules
async function setRules() {
    const data = {
        add: rules,
    }

    const response = await needle('post', rulesURL, data, {
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${TOKEN}`,
        },
    })

    return response.body
}


// Delete Stream Rules
async function deleteRules(rules) {
    if(!Array.isArray(rules.data)) {
        return null
    }

    const ids = rules.data.map(rule => rule.id)

    const data = {
        delete: {
            ids: ids,
        },
    }

    const response = await needle('post', rulesURL, data, {
        headers: {
            'content-type': 'application/json',
            Authorization: `Bearer ${TOKEN}`,
        }
    }) 

    return response.body
}

// Stream Tweets
function streamTweets(socket) {
    const stream = needle.get(streamURL, {
        headers: {
            Authorization: `Bearer ${TOKEN}`,
        }
    })

    stream.on('data', data => {
        try {
            const json = JSON.parse(data)
            // console.log(json)
            socket.emit('tweet', json)
        } catch (err) {console.log(err)}
    })

    return stream
}

// Connection to client
io.on('connection', async () => {
    console.log('Client Connected....')

    let currentRules

    try {
        // Get all stream Rules
        currentRules = await getRules()

        // Delete all stream Rules
        await deleteRules(currentRules)

        // Set rules based on array above
        await setRules()
    } catch (err) {
        console.error(err)
        process.exit(1)
    }
    streamTweets(io)
})



// Listen to PORT
server.listen(PORT, () => console.log(`listening on port ${PORT}`))