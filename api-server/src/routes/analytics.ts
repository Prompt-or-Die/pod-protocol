import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
  res.json({ 
    totalAgents: 8,
    activeChannels: 12,
    totalMessages: 1247 
  });
});

export default router; 