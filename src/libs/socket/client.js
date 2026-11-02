import { Client } from '@stomp/stompjs';
import { NettyClient } from './NettyClient';

const transport = import.meta.env.VITE_SOCKET_TRANSPORT || 'stomp';
const stompClient = new Client({
  brokerURL: import.meta.env.VITE_STOMP_WS_URL || 'ws://localhost:8080/ws',
  reconnectDelay: 5000,
  heartbeatIncoming: 10000,
  heartbeatOutgoing: 10000,
  onConnect: (frame) => {
    console.log('Connected: ' + frame);
  },
  onWebSocketError: (error) => {
    console.error('Error with websocket', error);
  },
  onStompError: (frame) => {
    console.error('Broker reported error: ' + frame.headers['message']);
    console.error('Additional details: ' + frame.body);
  },
});

let client;
if (transport === 'stomp') {
  client = stompClient;
} else if (transport === 'netty') {
  client = new NettyClient({
    url: import.meta.env.VITE_NETTY_WS_URL || 'ws://localhost:8090/ws',
  });
} else {
  throw new Error(`Unknown VITE_SOCKET_TRANSPORT value: ${transport}`);
}

export { stompClient, transport };
export default client;
