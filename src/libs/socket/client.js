import { Client } from '@stomp/stompjs';
const token = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3d';

const client = new Client({
  brokerURL: 'wss://wooms.duckdns.org/ws',
  // brokerURL: 'ws://localhost:8080/ws',
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

export default client;
