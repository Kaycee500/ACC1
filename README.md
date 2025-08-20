# Dad's Excel Tutor

A simple AI-powered Excel tutor designed for beginners, specifically targeting Windows users who are new to computers.

## Features

- Step-by-step Excel lessons for absolute beginners
- AI-powered chat tutor using OpenAI
- Lesson progress tracking
- Windows 10/11 focused instructions
- Simple, patient teaching style

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Kaycee500/ACC1.git
   cd ACC1
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_actual_openai_api_key_here
   ```
   
   Get your API key from: https://platform.openai.com/api-keys
   
   **Note:** The `.env` file is automatically loaded by the application using dotenv. Make sure your API key is valid and has sufficient credits.

4. **Start the application**
   ```bash
   npm start
   ```

5. **Open your browser**
   
   Visit: http://localhost:3000

## Environment Variables

- `OPENAI_API_KEY` (required) - Your OpenAI API key
- `OPENAI_MODEL` (optional) - Model to use (default: gpt-4o-mini)
- `PORT` (optional) - Port to run the server on (default: 3000)

## Deployment

For deployment on Vercel or other platforms, make sure to set the `OPENAI_API_KEY` environment variable in your deployment settings.

## Troubleshooting

If you see "OpenAI API key is missing or invalid" error:
1. Make sure you've set the `OPENAI_API_KEY` environment variable
2. Verify your API key is correct and has sufficient credits
3. For local development, make sure the `.env` file is in the root directory
4. For deployment, ensure environment variables are set in your hosting platform