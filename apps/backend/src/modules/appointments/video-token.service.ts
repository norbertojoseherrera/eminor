import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { JwtUser } from '../../common/decorators/current-user.decorator';

export interface RoomInfo {
  token: string;
  roomName: string;
  domain: string;
}

@Injectable()
export class VideoTokenService {
  constructor(private readonly config: ConfigService) {}

  generateRoomInfo(roomUuid: string, user: JwtUser): RoomInfo {
    const appId = this.config.get<string>('jitsi.appId');
    const kid = this.config.get<string>('jitsi.kid');
    const privateKey = this.config.get<string>('jitsi.privateKey');

    // Sin credenciales de 8x8 JaaS configuradas, se usa meet.jit.si sin JWT
    // (modo demo, válido solo para desarrollo local).
    if (!appId || !kid || !privateKey) {
      return { token: '', roomName: roomUuid, domain: 'meet.jit.si' };
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      aud: 'jitsi',
      iss: 'chat',
      sub: appId,
      room: roomUuid,
      exp: now + 3600,
      nbf: now - 10,
      context: {
        user: {
          id: user.id,
          name: user.email,
          email: user.email,
          moderator: user.role === 'DOCTOR',
        },
        features: {
          livestreaming: false,
          'file-upload': false,
          'outbound-call': false,
          'sip-outbound-call': false,
          transcription: false,
          'list-visitors': false,
          recording: false,
          flip: false,
        },
      },
    };

    const token = jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      keyid: kid,
    });

    return { token, roomName: `${appId}/${roomUuid}`, domain: '8x8.vc' };
  }
}
