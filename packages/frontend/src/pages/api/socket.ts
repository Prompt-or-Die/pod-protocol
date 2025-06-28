import { NextApiRequest } from 'next';
import { initializeWebSocketServer, NextApiResponseWithSocket } from '../../lib/websocket-server';

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (req.method === 'POST') {
    // Initialize WebSocket server
    const io = initializeWebSocketServer(res, {
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? ['https://pod-protocol.com'] // Update with your actual domain
          : ['http://localhost:3000'],
        methods: ['GET', 'POST'],
      },
    });

    console.log('WebSocket server initialized');
    res.status(200).json({ success: true, message: 'Socket server started' });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Disable body parsing for Socket.IO
export const config = {
  api: {
    bodyParser: false,
  },
};