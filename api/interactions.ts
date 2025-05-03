// This is ran upon interaction

import { SlashCreator, VercelServer, verifyKey } from 'slash-create';
import path from 'path';

export const creator = new SlashCreator({
  applicationID: process.env.DISCORD_APP_ID as string,
  publicKey: process.env.DISCORD_PUBLIC_KEY,
  token: process.env.DISCORD_BOT_TOKEN
});

creator.withServer(new VercelServer()).registerCommandsIn(path.join(__dirname, '..', 'commands'));

creator.on('warn', (message) => console.warn(message));
creator.on('error', (error) => console.error(error));
creator.on('commandRun', (command, _, ctx) =>
  console.info(`${ctx.user.username}#${ctx.user.discriminator} (${ctx.user.id}) ran command ${command.commandName}`)
);
creator.on('commandError', (command, error) => console.error(`Command ${command.commandName}:`, error));

// Create a custom handler for the Vercel endpoint to implement signature verification
const vercelEndpoint = async (req: {
  headers: {
    'x-signature-ed25519'?: string;
    'x-signature-timestamp'?: string;
  },
  body: any
}, res: {
  status: (code: number) => {
    end: (message: string) => void;
  }
}) => {
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  
  // Get the request body as text
  const rawBody: string = JSON.stringify(req.body);
  
  // Verify the request
  if (!signature || !timestamp || 
      !(await verifyKey(rawBody, signature, timestamp, process.env.DISCORD_PUBLIC_KEY as string))) {
    console.error('Invalid signature');
    return res.status(401).end('Invalid signature');
  }
  
  // If verification passes, process with slash-create's handler
  return (creator.server! as VercelServer).vercelEndpoint(req, res);
};

export default vercelEndpoint;
