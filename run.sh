#!/bin/bash
chmod +x ./cloudflared
# Start cloudflared in the background if token is provided
if [ ! -z "$CLOUDFLARED_TOKEN" ]; then
    ./cloudflared tunnel run --token "$CLOUDFLARED_TOKEN" &
fi
# Start the server
node server.js
