const AWS = require('aws-sdk');
const { TranscribeStreamingClient, StartStreamTranscriptionCommand } = require("@aws-sdk/client-transcribe-streaming");
const crypto = require('crypto');

// Initialize DynamoDB DocumentClient once (outside handler for re-use)
const ddb = new AWS.DynamoDB.DocumentClient();

// Pure function: Generate UUID (RFC4122 compliant simple implementation)
const generateUUID = () => 
  ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ crypto.randomBytes(1)[0] & 15 >> c / 4).toString(16)
  );

// Pure async generator to chunk audio data for streaming to AWS Transcribe
async function* audioStreamGenerator(buffer) {
  const chunkSize = 3200; // ~100ms @ 16kHz 16-bit PCM
  for (let offset = 0; offset < buffer.length; offset += chunkSize) {
    yield { AudioEvent: { AudioChunk: buffer.slice(offset, offset + chunkSize) } };
  }
}

// Pure function: Calls AWS Transcribe Streaming with audio chunks and retrieves full transcript
const transcribeAudio = async (audioData) => {
  const client = new TranscribeStreamingClient({ region: process.env.AWS_REGION || 'us-east-1' });

  const command = new StartStreamTranscriptionCommand({
    LanguageCode: "en-US",        // Customize language code as needed
    MediaEncoding: "pcm",         // Raw PCM encoding expected by AWS Transcribe
    MediaSampleRateHertz: 16000,  // Match the sample rate of your audio input
    AudioStream: audioStreamGenerator(audioData),
  });

  const response = await client.send(command);

  let transcriptText = "";

  for await (const event of response.TranscriptResultStream) {
    if (event.TranscriptEvent) {
      const results = event.TranscriptEvent.Transcript.Results;
      for (const result of results) {
        if (result.IsPartial === false) {
          for (const alt of result.Alternatives) {
            transcriptText += alt.Transcript + " ";
          }
        }
      }
    }
  }

  return transcriptText.trim();
};

// Persists transcript string into DynamoDB table
const persistTranscript = async (ddbClient, transcript) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE || "Transcriptions",
    Item: {
      id: generateUUID(),
      transcript,
      timestamp: Date.now(),
    },
  };
  return ddbClient.put(params).promise();
};

// Lambda handler entry point
exports.handler = async (event) => {
  try {
    if (!event.audioData) {
      throw new Error("No audioData field found in event");
    }

    // Decode base64 audio payload from event
    const audioBuffer = Buffer.from(event.audioData, 'base64');

    // Transcribe audio buffer to text
    const transcript = await transcribeAudio(audioBuffer);

    // Persist transcript into DynamoDB
    await persistTranscript(ddb, transcript);

    return {
      statusCode: 200,
      body: JSON.stringify({ transcript }),
    };
  } catch (error) {
    console.error("Error in transcription handler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Transcription failed" }),
    };
  }
};
