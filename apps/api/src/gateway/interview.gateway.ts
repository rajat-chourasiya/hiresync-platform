import {
  WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody,
  ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { canAccessCandidateChannel, canAccessInterviewerChannel } from 'src/common/helpers/interview-access';
import { resolveDisplayName } from 'src/common/helpers/resolve-display-name';


const prisma = new PrismaClient();

interface SocketUser {
  id: string;
  type: 'staff' | 'candidate';
  role?: string;
  orgId: string;
  roomId?: string;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class InterviewGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private logger = new Logger(InterviewGateway.name);

  handleConnection(socket: Socket) {
    const token = socket.handshake.auth?.token as string;
    if (!token) return socket.disconnect();

    try {
      try {
        const payload: any = jwt.verify(token, process.env.JWT_ACCESS_SECRET as string);
        socket.data.user = { id: payload.sub, type: 'staff', role: payload.role, orgId: payload.orgId } as SocketUser;
      } catch {
        const payload: any = jwt.verify(token, process.env.CANDIDATE_SESSION_SECRET as string);
        socket.data.user = { id: payload.candidateId, type: 'candidate', orgId: payload.orgId } as SocketUser;
      }
    } catch {
      this.logger.warn('Socket auth failed');
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    const user = socket.data.user as SocketUser;
    if (user?.roomId) this.server.to(user.roomId).emit('presence:left', { userId: user.id });
  }

  private async loadInterview(interviewId: string, orgId: string) {
    const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
    if (!interview || interview.orgId !== orgId) return null; // tenant isolation
    return interview;
  }

  // ---- Main room (video/code collaboration) — unchanged from before ----
  @SubscribeMessage('room:join')
  async handleJoinRoom(@ConnectedSocket() socket: Socket, @MessageBody() data: { roomId: string; interviewId: string }) {
    const user = socket.data.user as SocketUser;
    const interview = await this.loadInterview(data.interviewId, user.orgId);
    if (!interview || interview.roomId !== data.roomId) return socket.emit('error', { message: 'Invalid room' });

    const authorized = canAccessCandidateChannel(user, interview);
    if (!authorized) return socket.emit('error', { message: 'Not authorized for this room' });

    user.roomId = data.roomId;
    socket.join(data.roomId);
    this.server.to(data.roomId).emit('presence:joined', { userId: user.id, type: user.type });
  }

 @SubscribeMessage('code:snapshot')
async handleCodeSnapshot(@ConnectedSocket() socket: Socket, @MessageBody() data: { language: string; code: string }) {
  const user = socket.data.user as SocketUser;
  if (!user?.roomId) return;

  const last = await prisma.codeSnapshot.findFirst({ where: { roomId: user.roomId }, orderBy: { revision: 'desc' } });
  const snapshot = await prisma.codeSnapshot.create({
    data: { roomId: user.roomId, userId: user.id, language: data.language, code: data.code, revision: (last?.revision ?? 0) + 1 },
  });

  const displayName = await resolveDisplayName(user.id, user.type);
  socket.to(user.roomId).emit('code:updated', { ...snapshot, editorName: displayName });
}

@SubscribeMessage('cursor:move')
async handleCursorMove(@ConnectedSocket() socket: Socket, @MessageBody() data: { line: number; column: number }) {
  const user = socket.data.user as SocketUser;
  if (!user?.roomId) return;
  const displayName = await resolveDisplayName(user.id, user.type);
  socket.to(user.roomId).emit('cursor:update', { userId: user.id, name: displayName, ...data });
}

  // ---- NEW: Chat channels (candidate / interviewer) ----
  @SubscribeMessage('chat:join')
  async handleChatJoin(@ConnectedSocket() socket: Socket, @MessageBody() data: { interviewId: string; channel: 'candidate' | 'interviewer' }) {
    const user = socket.data.user as SocketUser;
    const interview = await this.loadInterview(data.interviewId, user.orgId);
    if (!interview) return socket.emit('error', { message: 'Interview not found' });

    const allowed = data.channel === 'candidate'
      ? canAccessCandidateChannel(user, interview)
      : canAccessInterviewerChannel(user, interview);

    if (!allowed) return socket.emit('error', { message: 'Not authorized for this channel' });

    const room = `interview:${data.interviewId}:${data.channel === 'candidate' ? 'candidate' : 'interviewers'}`;
    socket.join(room);
    socket.data.chatRoom = room;
    socket.data.chatChannel = data.channel === 'candidate' ? 'CANDIDATE' : 'INTERVIEWER';
    socket.data.interviewId = data.interviewId;
  }

  @SubscribeMessage('chat:send')
  async handleChatSend(@ConnectedSocket() socket: Socket, @MessageBody() data: { message: string }) {
    const user = socket.data.user as SocketUser;
    const room = socket.data.chatRoom as string;
    if (!room || !data.message?.trim()) return;

    const saved = await prisma.chatMessage.create({
      data: {
        roomId: socket.data.interviewId,
        channel: socket.data.chatChannel,
        senderId: user.id,
        senderType: user.type,
        message: data.message.trim(),
      },
    });
    this.server.to(room).emit('chat:message', saved);
  }

  @SubscribeMessage('chat:typing')
  handleTyping(@ConnectedSocket() socket: Socket) {
    const user = socket.data.user as SocketUser;
    const room = socket.data.chatRoom as string;
    if (room) socket.to(room).emit('chat:typing', { userId: user.id });
  }

  @SubscribeMessage('chat:stop-typing')
  handleStopTyping(@ConnectedSocket() socket: Socket) {
    const user = socket.data.user as SocketUser;
    const room = socket.data.chatRoom as string;
    if (room) socket.to(room).emit('chat:stop-typing', { userId: user.id });
  }

  @SubscribeMessage('chat:read')
  handleRead(@ConnectedSocket() socket: Socket) {
    const user = socket.data.user as SocketUser;
    const room = socket.data.chatRoom as string;
    if (room) socket.to(room).emit('chat:read', { userId: user.id, at: new Date() });
  }
}