import process from 'process';
import { Equal } from 'typeorm';
import { AppDataSource } from '../model/dataSource';
import { decodeToken, removeTokenCookie, setTokenCookie, signin } from '../module/auth';
import { UserORM } from '../model/user';

const authMiddleware = async ({ req, res }) => {
  const access = req.headers.authorization;
  //const refresh = req.headers['refresh-token'] as string;
  const refresh = req.cookies?.['refresh-token'];

  if (!access) {
    return { res, req, dataSource: AppDataSource };
  }

  const accessDecode = decodeToken(access, process.env.APP_ACCESS_SECRETKEY);

  // access token expiresIn check
  if (accessDecode === -3 || accessDecode === -2) {
    if (!refresh) {
      return { res, req, dataSource: AppDataSource };
    }

    const refreshDecode = decodeToken(refresh, process.env.APP_REFRESH_SECRETKEY);

    const findUser = await AppDataSource.getRepository(UserORM).findBy({
      refresh: Equal(refresh),
    });

    //invalid check
    if (refreshDecode === -3 || refreshDecode === -2) {
      removeTokenCookie(res, 'access-token');
      removeTokenCookie(res, 'refresh-token');
      return {
        res,
        req,
        dataSource: AppDataSource,
      };
    }

    // refresh token expiresIn check & db refresh token check
    if (findUser.length > 0 && refreshDecode !== -3 && refreshDecode !== -2) {
      const { token, refreshToken } = signin({
        user_id: refreshDecode.user_id,
        user_name: refreshDecode.user_name,
      });

      setTokenCookie(res, 'access-token', token, 60 * 60);
      setTokenCookie(res, 'refresh-token', refreshToken, 60 * 60 * 24 * 14);

      await AppDataSource.getRepository(UserORM).update(
        { user_id: refreshDecode.user_id },
        { refresh: refreshToken }
      );

      return {
        res,
        req,
        dataSource: AppDataSource,
        accessToken: token,
        refreshToken,
      };
    }
  }

  return {
    res,
    req,
    dataSource: AppDataSource,
    accessToken: access,
    refreshToken: refresh,
  };
};
export default authMiddleware;
