import { Router } from 'express';
const router = Router();

// your route definitions
router.get('/', (req, res) => {
  res.send('Final Trial Balance working');
});

export default router;  // <-- ✅ ES module export
