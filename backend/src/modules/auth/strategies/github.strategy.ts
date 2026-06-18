import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { OAuthProfile } from './google.strategy';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GITHUB_CLIENT_ID', 'placeholder'),
      clientSecret: config.get<string>('GITHUB_CLIENT_SECRET', 'placeholder'),
      callbackURL: config.get<string>(
        'GITHUB_CALLBACK_URL',
        'http://localhost:3000/auth/github/callback',
      ),
      scope: ['user:email'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      username?: string;
      displayName?: string;
      emails?: { value: string }[];
      photos?: { value: string }[];
    },
    done: (err: unknown, user?: OAuthProfile) => void,
  ) {
    const user: OAuthProfile = {
      provider: 'GITHUB',
      providerId: profile.id,
      email: profile.emails?.[0]?.value,
      name: profile.displayName || profile.username,
      avatar: profile.photos?.[0]?.value,
    };
    done(null, user);
  }
}
