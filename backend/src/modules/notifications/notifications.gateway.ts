import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * Real-time bildirishnomalar.
 *
 * Frontend ulanishi:
 *   const socket = io('http://localhost:3000', { auth: { token: accessToken } });
 *   socket.on('notification', (data) => { ... });
 *
 * Har bir user o'z `user:<id>` xonasiga qo'shiladi. Yangi bildirishnoma
 * yaratilganda faqat o'sha xonaga emit qilinadi.
 */
@WebSocketGateway({
  cors: { origin: true, credentials: true },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Ulanish: token tekshiriladi, to'g'ri bo'lsa user xonasiga qo'shiladi. */
  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        this.extractFromHeader(client.handshake.headers.authorization);

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET', 'dev-secret'),
      });

      const userId = payload.sub;
      client.data.userId = userId;
      await client.join(this.room(userId));
      this.logger.debug(`Ulandi: user=${userId} socket=${client.id}`);
    } catch {
      // Yaroqsiz token — ulanishni uzamiz
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Uzildi: socket=${client.id}`);
  }

  /** Service shu metod orqali aniq bir userga real-time yuboradi. */
  emitToUser(userId: string, notification: unknown) {
    this.server.to(this.room(userId)).emit('notification', notification);
  }

  private room(userId: string) {
    return `user:${userId}`;
  }

  private extractFromHeader(header?: string): string | undefined {
    if (header?.startsWith('Bearer ')) {
      return header.slice(7);
    }
    return undefined;
  }
}
