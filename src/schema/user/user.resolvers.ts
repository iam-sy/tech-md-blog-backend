import { GraphQLError } from 'graphql';
import { UserORM } from '../../model/user.js';
import {
  authPassword,
  decodeToken,
  removeTokenCookie,
  setTokenCookie,
  signin,
} from '../../module/auth.js';
import { Equal } from 'typeorm';
import process from 'process';

export default {
  Mutation: {
    join_user: async (_, { user_id, user_name, user_password }, context) => {
      if (!user_name || !user_password || !user_id) {
        throw new GraphQLError(`Required`, {
          extensions: {
            code: 'GRAPHQL_VALIDATION_FAILED',
            http: { status: 400 },
          },
        });
      }

      const findId = await context.dataSource.getRepository(UserORM).findBy({
        user_id: Equal(user_id),
      });

      if (findId.length > 0) {
        throw new GraphQLError(`사용 불가능한 아이디 입니다.`, {
          extensions: {
            code: 'GRAPHQL_VALIDATION_FAILED',
            http: { status: 400 },
          },
        });
      }

      try {
        const newUser = new UserORM();
        newUser.user_password = authPassword(user_password);
        newUser.user_id = user_id;
        newUser.user_name = user_name;

        await context.dataSource.manager.save(newUser);
        return { status: true };
      } catch (e) {
        throw new GraphQLError('join server error', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            http: { status: 500 },
          },
        });
      }
    },

    login: async (_, user, context, ____) => {
      const { dataSource, accessToken, res } = context;

      const selectUser = await dataSource
        .getRepository(UserORM)
        .findOneBy({ user_id: user.user_id });

      if (!selectUser) return null; // 해당 ID가 없을 때

      const hashed = authPassword(user.user_password);

      if (accessToken) {
        throw new GraphQLError('is logined', {
          extensions: {
            code: 'IS_LOGINED',
            http: { status: 401 },
          },
        });
      } // 해당 ID로 이미 로그인되어 있을 때

      if (hashed !== selectUser.user_password) {
        throw new GraphQLError(`Password not mached!`, {
          extensions: {
            code: 'UNAUTHORIZED',
            http: { status: 401 },
          },
        });
      } // 비밀번호가 일치하지 않을 때

      const { token, refreshToken } = signin(selectUser);

      try {
        await dataSource
          .getRepository(UserORM)
          .update({ user_id: selectUser.user_id }, { refresh: refreshToken });

        setTokenCookie(res, 'access-token', token, 60 * 60);
        setTokenCookie(res, 'refresh-token', refreshToken, 60 * 60 * 24 * 14);
      } catch (e) {
        throw new GraphQLError('login server error', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            http: { status: 500 },
          },
        });
      }

      return {
        user_id: selectUser.user_id,
        user_name: selectUser.user_name,
      };
    },

    authorticate: (_, __, { accessToken }) => {
      if (!accessToken) {
        throw new GraphQLError('로그인이 필요합니다.', {
          extensions: {
            code: 'UNAUTHORIZED',
            http: { status: 403 },
          },
        });
      }

      const accessDecode = decodeToken(accessToken, process.env.APP_ACCESS_SECRETKEY);

      return { user_id: accessDecode.user_id, user_name: accessDecode.user_name };
    },

    logout: async (_, __, { res, dataSource, accessToken }) => {
      try {
        removeTokenCookie(res, 'access-token');
        removeTokenCookie(res, 'refresh-token');
        const accessDecode = decodeToken(accessToken, process.env.APP_ACCESS_SECRETKEY);
        await dataSource
          .getRepository(UserORM)
          .update({ user_id: accessDecode.user_id }, { refresh: null });
      } catch (e) {
        throw new GraphQLError('logout server error', {
          extensions: {
            code: 'INTERNAL_SERVER_ERROR',
            http: { status: 500 },
          },
        });
      }

      return { status: true };
    },
  },
};
