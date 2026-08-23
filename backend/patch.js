const fs = require('fs');
fs.writeFileSync('src/utils/response.utils.ts', 'export const successResponse = (res: any, data: any) => res.json(data); export const errorResponse = (res: any, error: any, status=400) => res.status(status).json({error: error.message || error});');
const queuesIdx = fs.readFileSync('src/queues/index.ts', 'utf8') + '\nexport * from "./notification.queue";\nexport * from "./calendar.queue";\nexport * from "./medication.queue";\nexport * from "./slotHold.queue";';
fs.writeFileSync('src/queues/index.ts', queuesIdx);
const auth = fs.readFileSync('src/middleware/auth.ts', 'utf8') + '\nexport const authenticate = auth;';
fs.writeFileSync('src/middleware/auth.ts', auth);
const replaceInDir = (dir) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (fs.statSync(dir + '/' + file).isDirectory()) replaceInDir(dir + '/' + file);
    else if (file.endsWith('.ts')) {
      let content = fs.readFileSync(dir + '/' + file, 'utf8');
      content = content.replace(/req\.params\.\w+/g, '($& as string)');
      content = content.replace(/requireRole\(['"](ADMIN|DOCTOR|PATIENT)['"]\)/g, 'requireRole(Role.$1)');
      content = content.replace(/requireRole\((ADMIN|DOCTOR|PATIENT)\)/g, 'requireRole(Role.$1)');
      content = content.replace(/sendNotificationEmail/g, 'send');
      fs.writeFileSync(dir + '/' + file, content);
    }
  }
};
replaceInDir('src');
