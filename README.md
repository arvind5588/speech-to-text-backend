# Speech-to-Text Backend

This project provides a pure functional style Node.js WebSocket server integrated with AWS Lambda for speech-to-text processing. It is designed as a reference/template to build scalable, real-time transcription backends.

## Project Structure

speech-to-text-backend/
├── lambda/
│ └── index.js # AWS Lambda handler
├── websocket/
│ └── websocketGateway.js # Node.js WebSocket server
├── package.json # npm dependencies
├── README.md
└── .gitignore


## Getting Started

1. Install dependencies:

2. Start the WebSocket server locally:

The WebSocket server listens on port 3000 by default.

3. Deploy the Lambda function `lambda/index.js` on AWS Lambda, and set the function name in the WebSocket server's AWS Lambda invoke function.

## Notes on HIPAA Compliance and Production Usage

- This project is a reference implementation and is **not** production-ready.
- Ensure proper security controls, encryption, authentication, and compliance audits for HIPAA.
- Customize and extend AWS Transcribe streaming integration as required.

## License

MIT License. See LICENSE for more details.
