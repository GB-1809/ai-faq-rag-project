# AI FAQ RAG Project

This is an AI-powered FAQ system using Retrieval-Augmented Generation (RAG) for intelligent question answering.

## Project Structure

- **backend/**: Python Flask backend with RAG implementation, embeddings, and vector storage.
- **frontend-react/**: React frontend for user interaction.
- **data/**: Contains processed data, FAISS indices, and JSON files for FAQs and documents.

## Features

- Upload and process documents
- Generate embeddings for semantic search
- RAG-based question answering
- User management and analytics
- Bulk import of FAQs

## Setup

### Backend
1. Navigate to `backend/`
2. Install dependencies: `pip install -r requirements.txt`
3. Run the server: `python app.py`

### Frontend
1. Navigate to `frontend-react/`
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`

## Usage

Start both backend and frontend servers, then access the application through the frontend.

## Technologies

- Backend: Python, Flask, FAISS, Sentence Transformers
- Frontend: React, Vite, Tailwind CSS