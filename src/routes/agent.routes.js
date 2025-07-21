import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Agent routes working' });
});

export default router;
