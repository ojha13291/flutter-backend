# Smart Tourist Safety Monitor - Backend API

![Socket.io](https://img.shields.io/badge/Socket.io-black?style=for-the-badge&logo=socket.io)

A backend API for safety monitoring with real-time emergency alerts, blockchain identity verification, and GPS tracking.

---

## Features

-   **Email OTP Authentication**: Secure registration with auto-generated Tourist IDs.
-   **Real-time SOS System**: Instant emergency alerts with Socket.IO.
-   **GPS Location Tracking**: Live location sharing and monitoring.
-   **Blockchain Integration**: Ethereum-based identity verification.
-   **Emergency Notifications**: SMS/Email alerts to emergency contacts.
-   **Medical Info Storage**: Critical health information for emergencies.
-   **Safety Analytics**: Tourist safety status monitoring.

---

## Quick Start

### Prerequisites

-   Node.js >= 18.0.0
-   MongoDB >= 6.0
-   Git

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/your-username/smart-tourist-backend.git](https://github.com/your-username/smart-tourist-backend.git)
    cd smart-tourist-backend
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Set up environment variables**
    ```bash
    cp .env.example .env
    # Edit .env with your configurations
    ```

4.  **Start MongoDB (if local)**
    ```bash
    mongod
    ```

5.  **Run the application**
    ```bash
    npm run dev
    ```

### Environment Setup

Create a `.env` file with the following variables:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/smart_tourist
NODE_ENV=development
PORT=5000

# Security
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_complex
JWT_EXPIRES_IN=7d

# Email Configuration (Gmail example)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Blockchain (Optional - Sepolia Testnet)
SEPOLIA_RPC_URL=[https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY](https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY)
CONTRACT_ADDRESS=contract-key
OWNER_PRIVATE_KEY=your_private_key_here