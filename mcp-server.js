const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const { generatePrivateKey, getPublicKey, getEventHash, signEvent, relayInit } = require('nostr-tools');

const server = new McpServer({
  name: 'traceability-demo',
  version: '0.1.0'
});

server.registerTool(
  'generate-produce-key',
  {
    title: 'Generate Produce Key',
    description: 'Generate a Nostr key pair for a produce item',
    inputSchema: z.object({})
  },
  async () => {
    const sk = generatePrivateKey();
    const pk = getPublicKey(sk);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ privateKey: sk, publicKey: pk })
        }
      ]
    };
  }
);

server.registerTool(
  'publish-produce-event',
  {
    title: 'Publish Produce Event',
    description: 'Publish a produce metadata event to a Nostr relay',
    inputSchema: z.object({
      relayUrl: z.string(),
      privateKey: z.string(),
      identifier: z.string(),
      content: z.string()
    })
  },
  async ({ relayUrl, privateKey, identifier, content }) => {
    const event = {
      kind: 30000,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['d', identifier]],
      content
    };
    event.pubkey = getPublicKey(privateKey);
    event.id = getEventHash(event);
    event.sig = signEvent(event, privateKey);

    const relay = relayInit(relayUrl);
    await relay.connect();
    const pub = relay.publish(event);
    await new Promise((resolve, reject) => {
      pub.on('ok', resolve);
      pub.on('failed', (err) => reject(new Error(err)));
    });
    relay.close();

    return {
      content: [
        { type: 'text', text: JSON.stringify({ id: event.id }) }
      ]
    };
  }
);

const transport = new StdioServerTransport();
server.connect(transport).then(() => {
  console.log('MCP server ready');
});
