import { config } from 'dotenv';
config({ path: '.env.local' });

import { createServer } from 'node:http';
import handler from '../[[...route]].js';

const PORT = 3001;
createServer(handler).listen(PORT, () => {
  console.log(`API dev server: http://localhost:${PORT}`);
});
