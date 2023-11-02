import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { GraphQLError } from 'graphql';

const TOKEN_EXPIRED = -3;
const TOKEN_INVALID = -2;

export function decodeToken(token: string, secret: string) {
  let decoded;
  try {
    // verify를 통해 값 decode!
    decoded = jwt.verify(token, secret);
  } catch (err) {
    if (err.message === 'jwt expired') {
      console.log('expired token');
      return TOKEN_EXPIRED;
    } else if (err.message === 'invalid token') {
      console.log('invalid token');
      console.log(TOKEN_INVALID);
      return TOKEN_INVALID;
    } else {
      console.log('invalid token');
      return TOKEN_INVALID;
    }
  }
  return decoded;
}

export function authPassword(password: string) {
  const salt = crypto
    .createHmac('sha256', process.env.APP_PASSWORD_HASH_KEY)
    .update(password)
    .digest('hex');
  return salt;
}

export const signin = (user: { user_id: string; user_name: string }) => {
  const tokenPayload = {
    user_id: user.user_id,
    user_name: user.user_name,
  };
  const refreshTokenPayload = {
    user_id: user.user_id,
    user_name: user.user_name,
    refresh_key: `${user.user_name}-key`,
  };
  const options = {
    //sign메소드를 통해 access token 발급!
    issuer: process.env.APP_FRONT_DOMAIN,
    algorithm: 'HS256', // 해싱 알고리즘
  };

  const result = {
    //sign메소드를 통해 access token 발급! maxAge : 3600
    token: jwt.sign(tokenPayload, process.env.APP_ACCESS_SECRETKEY, {
      ...options,
      expiresIn: '1h',
    }),
    refreshToken: jwt.sign(refreshTokenPayload, process.env.APP_REFRESH_SECRETKEY, {
      ...options,
      // maxAge 60*60*24*14
      expiresIn: '14d',
    }),
  };
  return result;
};

export function setTokenCookie(res, name, token, maxAge) {
  res.cookie(name, token, {
    domain: process.env.APP_FRONT_DOMAIN,
    secure: process.env.NODE_ENV !== 'develop',
    httpOnly: true,
    maxAge,
    sameSite: 'lax',
  });
}
export function removeTokenCookie(res, name) {
  res.cookie(name, '', {
    maxAge: 0,
  });
}

export function authStateCheck(accessToken) {
  const accessDecode = decodeToken(accessToken, process.env.APP_ACCESS_SECRETKEY);

  if (!accessToken || accessDecode === -3 || accessDecode === -2) {
    throw new GraphQLError('로그인이 필요합니다.', {
      extensions: {
        code: 'UNAUTHORIZED',
        http: { status: 403 },
      },
    });
  }
  return accessDecode;
}
