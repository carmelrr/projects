import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { MessagingGateway } from './messaging.gateway';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';

@Controller('messaging')
export class MessagingController {
  constructor(
    private messagingService: MessagingService,
    private messagingGateway: MessagingGateway,
  ) {}

  @Get('threads')
  async listThreads(@CurrentUser() user: CurrentUserPayload) {
    return this.messagingService.listThreads(user.sub, user.orgId);
  }

  @Post('threads/direct')
  async getOrCreateDirect(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { userId: string },
  ) {
    return this.messagingService.getOrCreateDirectThread(user.orgId, user.sub, body.userId);
  }

  @Get('threads/:threadId/messages')
  async getMessages(
    @Param('threadId') threadId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messagingService.getMessages(
      threadId,
      user.sub,
      user.orgId,
      cursor,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Post('threads/:threadId/messages')
  async sendMessage(
    @Param('threadId') threadId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { body?: string; messageType?: string; assetId?: string; replyToId?: string },
  ) {
    const message = await this.messagingService.sendMessage(threadId, user.sub, user.orgId, body);
    // Broadcast via WebSocket
    await this.messagingGateway.broadcastMessage(threadId, message as any);
    return message;
  }

  @Post('threads/:threadId/read')
  async markRead(
    @Param('threadId') threadId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.messagingService.markRead(threadId, user.sub, user.orgId);
  }
}
