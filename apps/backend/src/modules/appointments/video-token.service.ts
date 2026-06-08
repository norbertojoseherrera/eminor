import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwtUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class VideoTokenService {
  constructor(private readonly config: ConfigService) {}

  generateToken(roomUuid: string, user: JwtUser): string {
    const appId = this.config.get<string>('jitsi.appId') ?? 'eminor';
    const appSecret = this.config.get<string>('jitsi.appSecret');

    const payload = {
      iss: appId,
      sub: 'meet.jit.si',
      aud: 'jitsi',
      room: roomUuid,
      exp: Math.floor(Date.now() / 1000) + 3600,
      context: {
        user: {
          id: user.id,
          name: user.email,
          moderator: user.role === 'DOCTOR',
        },
      },
    };

    if (!appSecret) {
      return jwt.sign(payload, 'dev-secret-not-for-prod');
    }

    return jwt.sign(payload, appSecret);
  }
}
