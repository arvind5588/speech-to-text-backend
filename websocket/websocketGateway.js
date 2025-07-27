const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const AWS = require('aws-sdk');

// invokes AWS Lambda to run speech-to-text
const invokeLambdaSpeechToText = (lambdaClient) => async (audioBuffer) => {
  const params = {
    FunctionName: 'SpeechToTextFunction',
    Payload: JSON.stringify({ audioData: audioBuffer.toString('base64') }),
  };
  const response = await lambdaClient.invoke(params).promise();
  return JSON.parse(response.Payload);
};

// handles message from WebSocket clients
const handleMessage = (invokeLambdaFn) => async (message, ws) => {
  try {
    const result = await invokeLambdaFn(message);
    ws.send(JSON.stringify(result));
  } catch (error) {
    ws.send(JSON.stringify({ error: 'Processing failed' }));
  }
};

const createWebSocketServer = (port) => {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocket.Server({ server });

  // Dependency injection: AWS Lambda client
  const lambdaClient = new AWS.Lambda({ region: 'us-east-1' });
  const invokeLambdaFn = invokeLambdaSpeechToText(lambdaClient);
  const messageHandler = handleMessage(invokeLambdaFn);

  wss.on('connection', (ws) => {
    ws.on('message', async (message) => {
      const dataBuffer = Buffer.isBuffer(message) ? message : Buffer.from(message);
      await messageHandler(dataBuffer, ws);
    });
  });

  server.listen(port, () => console.log(`WebSocket server running on port ${port}`));
  return server;
};

module.exports = { createWebSocketServer };
