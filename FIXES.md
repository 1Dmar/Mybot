# Bot Fixes and Updates

## Issues Fixed

### 1. **Event Handler Error: `client.on is not a function`**
- **Problem**: The `messageCreate.js` event file was directly calling `client.on()` instead of exporting a properly structured event module.
- **Solution**: Refactored `messageCreate.js` to export an object with `name`, and `execute` properties, following the standard Discord.js event handler pattern.
- **Impact**: Events now load correctly without errors.

### 2. **Invalid Authorization Header Error**
- **Problem**: Multiple environment variable names were used inconsistently (`BOT_TOKEN`, `BOT1_TOKEN`, `BOT1_1_TOKEN`), causing undefined tokens to be passed to Discord API.
- **Solution**: 
  - Updated `bot/settings/config.js` to check multiple token variables in priority order: `BOT_TOKEN` > `BOT1_1_TOKEN` > `BOT1_TOKEN`
  - Updated `server.js` to use consistent token handling
  - Added `.env.example` with clear documentation
- **Impact**: Bot can now authenticate properly with Discord API.

### 3. **Cloudflare Tunnel Removed**
- **Problem**: The `run.sh` script was starting a Cloudflare tunnel with a hardcoded token (security risk), and using broken pipe commands.
- **Solution**: 
  - Removed `cloudflared` binary and directory
  - Simplified `run.sh` to just install dependencies and start the bot server
  - Removed the hardcoded tunnel token from the repository
- **Impact**: Improved security and simplified deployment. Bot now runs directly without tunnel overhead.

### 4. **Environment Variables**
- **Problem**: Missing `.env.example` file and inconsistent token naming.
- **Solution**: Created `.env.example` with all required environment variables documented.
- **Impact**: Easier setup for new developers.

## Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/1Dmar/Mybot.git
   cd Mybot
   ```

2. **Create `.env` file**:
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables** in `.env`:
   - `BOT_TOKEN`: Your Discord bot token
   - `MONGO_URL`: Your MongoDB connection string
   - `PREFIX`: Command prefix (default: `!`)
   - Other optional variables

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Start the bot**:
   ```bash
   npm start
   # or
   node server.js
   # or
   bash run.sh
   ```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BOT_TOKEN` | Yes | - | Discord bot token (recommended) |
| `BOT1_TOKEN` | No | - | Alternative token variable (backwards compatibility) |
| `BOT1_1_TOKEN` | No | - | Alternative token variable (backwards compatibility) |
| `MONGO_URL` | Yes | - | MongoDB connection string |
| `PREFIX` | No | `!` | Bot command prefix |
| `GuildID` | No | `1058104907204395008` | Guild ID for testing slash commands |
| `API_KEY` | No | - | API key for external services |
| `PORT` | No | `6269` | Server port |
| `NODE_ENV` | No | `production` | Node environment |

## Testing

After setup, the bot should:
1. Connect to Discord without authorization errors
2. Load all events and commands successfully
3. Respond to commands with the configured prefix
4. Run the dashboard on `http://localhost:6269/dash`

## Security Notes

- Never commit `.env` files to the repository
- Keep your `BOT_TOKEN` secret
- Use environment variables for all sensitive data
- The hardcoded webhook URL in `bot/index.js` should be moved to environment variables for production use

## Additional Notes

- The bot now runs without Cloudflare Tunnel, making it suitable for local development or direct server deployment
- All event handlers follow the standard Discord.js v14 pattern
- Message commands and slash commands are both supported
