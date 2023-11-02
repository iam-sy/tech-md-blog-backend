import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import http from 'http';
import cors from 'cors';
import express from 'express';
import pkg from 'body-parser';
//NOTE: Node.js does not allow directory imports
import { execSchema } from './schema/execSchema.js';
import { AppDataSource } from './model/dataSource.js';
import { decodeToken, removeTokenCookie, setTokenCookie, signin } from './module/auth.js';
import { UserORM } from './model/user.js';
import * as process from 'process';
import { Equal } from 'typeorm';

const { json } = pkg;

//Create Express app/server
const app = express();
const httpServer = http.createServer(app);

//Apply schema and plugins to server
const index = new ApolloServer({
  schema: execSchema,
  introspection: true,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
});

await AppDataSource.initialize()
  .then(async () => {
    console.log('Postgres TypeORM Database initialized');
  })
  .catch((error) => console.log(error));

//Start server
await index.start();

//Cors Options

const corsOptions: cors.CorsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

//Apply express middleware
app.use(
  '/graphql',
  cors<cors.CorsRequest>(corsOptions),
  json(),
  expressMiddleware(index, {
    context: async ({ req, res }) => {
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

      return { res, req, dataSource: AppDataSource, accessToken: access, refreshToken: refresh };
    },
  })
);

const port = Number.parseInt(process.env.PORT) || 3000;

await new Promise<void>((resolve) => httpServer.listen({ port: port }, resolve));
console.log(`🚀 Server listening at: ${port}`);
