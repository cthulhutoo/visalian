import React, { useState } from 'react';
import { relayInit, generatePrivateKey, getPublicKey, getEventHash, signEvent, nip19 } from 'nostr-tools';

function TraceDemo() {
  const [sk, setSk] = useState('');
  const [pk, setPk] = useState('');
  const [relayUrl, setRelayUrl] = useState('wss://relay.damus.io');
  const [content, setContent] = useState('');
  const [events, setEvents] = useState([]);

  function generate() {
    const s = generatePrivateKey();
    setSk(s);
    setPk(getPublicKey(s));
  }

  async function publish() {
    if (!sk) return;
    const event = {
      kind: 30000,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ['p', pk],
        ['t', 'produce-demo']
      ],
      content
    };
    event.pubkey = pk;
    event.id = getEventHash(event);
    event.sig = signEvent(event, sk);

    const relay = relayInit(relayUrl);
    await relay.connect();
    await relay.publish(event);
    relay.close();
  }

  async function subscribe() {
    if (!pk) return;
    const relay = relayInit(relayUrl);
    await relay.connect();
    const sub = relay.sub([{ kinds: [30000], authors: [pk] }]);
    sub.on('event', e => {
      setEvents(prev => [...prev, e]);
    });
    setTimeout(() => {
      sub.unsub();
      relay.close();
    }, 5000);
  }

  return (
    <main style={{ padding: '1rem' }}>
      <h1>Nostr Produce Demo</h1>
      <button onClick={generate}>Generate Produce Key</button>
      {pk && (
        <p>
          Produce public key: {nip19.npubEncode(pk)}
        </p>
      )}
      <div>
        <label>
          Relay URL:
          <input value={relayUrl} onChange={e => setRelayUrl(e.target.value)} />
        </label>
      </div>
      <div>
        <label>
          Event content:
          <input value={content} onChange={e => setContent(e.target.value)} />
        </label>
      </div>
      <div style={{ marginTop: '1rem' }}>
        <button onClick={publish} disabled={!sk} style={{ marginRight: '0.5rem' }}>
          Publish Event
        </button>
        <button onClick={subscribe} disabled={!pk}>
          Load Events
        </button>
      </div>
      <ul>
        {events.map(e => (
          <li key={e.id}>{e.content}</li>
        ))}
      </ul>
    </main>
  );
}

export default TraceDemo;
