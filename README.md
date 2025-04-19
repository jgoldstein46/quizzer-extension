# Quizzer Chrome Extension

A Chrome extension that generates contextual quizzes based on article content that users are reading. It leverages Anthropic's Claude 3.7 Sonnet LLM to create questions that encourage critical thinking and deeper engagement with digital content.

## Features

- Automatically extracts content from articles and webpages
- Generates contextually relevant quiz questions using Claude 3.7 Sonnet
- Supports text input for answering questions
- Provides intelligent response evaluation with feedback
- Implements a user-friendly Chrome sidebar interface

## Setup and Installation

### Prerequisites

- Node.js (v14.0.0 or higher)
- Chrome Browser
- Anthropic API Key (for Claude 3.7 Sonnet)

### Environment Configuration

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
   VITE_ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
   ```

3. Adjust other configuration variables as needed (model, tokens, temperature)

### Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` directory

## Project Structure

- `src/`: Source code
  - `background/`: Chrome extension background scripts
  - `content/`: Content scripts for webpage interaction
  - `components/`: React UI components
  - `services/`: Service modules including Claude API integration
  - `assets/`: Static assets

## Technology Stack

- React + TypeScript
- Vite for building
- Chrome Extension Manifest V3
- Anthropic Claude 3.7 Sonnet API
