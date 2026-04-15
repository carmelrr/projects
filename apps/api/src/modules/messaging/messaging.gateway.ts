import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MessagingService } from './messaging.service';

@WebSocketGateway({ namespace: '/messaging', cors: { origin: '*' } })
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private messagingService: MessagingService) {}

  handleConnection(client: Socket) {
    // Auth validation would happen here via middleware
    const userId = client.handshake.auth?.userId;
    if (userId) {
      client.join(`user:${userId}`);
    }
  }

  handleDisconnect(_client: Socket) {
    // Cleanup
  }

  @SubscribeMessage('join_thread')
  handleJoinThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadId: string },
  ) {
    client.join(`thread:${data.threadId}`);
  }

  @SubscribeMessage('leave_thread')
  handleLeaveThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadId: string },
  ) {
    client.leave(`thread:${data.threadId}`);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadId: string; userId: string },
  ) {
    client.to(`thread:${data.threadId}`).emit('user_typing', {
      threadId: data.threadId,
      userId: data.userId,
    });
  }

  @SubscribeMessage('stop_typing')
  handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadId: string; userId: string },
  ) {
    client.to(`thread:${data.threadId}`).emit('user_stop_typing', {
      threadId: data.threadId,
      userId: data.userId,
    });
  }

  // Called by the messaging service after creating a message
  async broadcastMessage(threadId: string, message: Record<string, unknown>) {
    this.server.to(`thread:${threadId}`).emit('new_message', message);
  }
}
