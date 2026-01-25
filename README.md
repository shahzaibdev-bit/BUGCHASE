# BugChase - Advanced Bug Bounty Platform

BugChase is a next-generation bug bounty and vulnerability disclosure platform connecting organizations with elite security researchers.

## 🚀 Project Structure

This repository contains the complete source code for the BugChase ecosystem:

-   **`/client`**: Frontend application built with React, Vite, TailwindCSS, and Shadcn UI.
-   **`/server`**: Backend API built with Node.js, Express, and MongoDB.
-   **`/kyc_engine`**: AI-powered Identity Verification microservice built with Python, FastAPI, and DeepFace.

## 🛠️ Technology Stack

### Frontend (`/client`)
-   **Framework**: React (Vite)
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS, PostCSS
-   **UI Library**: Shadcn UI, Radix UI
-   **Animations**: Framer Motion, GSAP
-   **State Management**: React Query, Context API

### Backend (`/server`)
-   **Runtime**: Node.js
-   **Framework**: Express.js
-   **Database**: MongoDB (Mongoose)
-   **Caching**: Redis
-   **Authentication**: JWT, BCrypt
-   **Validation**: Zod

### KYC Engine (`/kyc_engine`)
-   **Framework**: FastAPI (Python)
-   **AI/ML**: DeepFace, OpenCV, EasyOCR
-   **Purpose**: Automated identity verification for researchers.

## 🏁 Getting Started

### Prerequisites
-   Node.js (v18+)
-   Python (v3.9+)
-   MongoDB
-   Redis

### Installation & Running

1.  **Frontend**:
    ```bash
    cd client
    npm install
    npm run dev
    ```

2.  **Backend**:
    ```bash
    cd server
    npm install
    npm run dev
    ```

3.  **KYC Engine**:
    ```bash
    cd kyc_engine
    pip install -r requirements.txt
    python main.py
    ```

## 🔒 Security

This platform is designed with security-first principles.
-   All API endpoints are protected.
-   Input validation via Zod.
-   Rate limiting and helmet protection enabled.

## 📄 License

Private Repository. All Rights Reserved.
