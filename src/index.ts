import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import http from 'http';
import cors from 'cors';
import express from 'express';
import pkg from 'body-parser';
import helmet from 'helmet';
//NOTE: Node does not allow directory imports
import { AppDataSource } from './model/dataSource';
import * as process from 'process';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { loadFiles, loadFilesSync } from '@graphql-tools/load-files';
import path from 'path';
import { mergeResolvers } from '@graphql-tools/merge';
import authMiddleware from './middleware/apolloAuth';

async function initServer() {
  const { json } = pkg;
  //Create Express app/server
  const app = express();
  const httpServer = http.createServer(app);
  //Apply schema and plugins to server
  const typeDefs = loadFilesSync(path.join(__dirname, './schema/**/*.graphql'), {
    recursive: true,
    extensions: ['graphql'],
  });

  async function getResolvers() {
    const resolversPath = path.join(__dirname, './schema/**/*.resolvers.*');
    const resolversArray = await loadFiles(resolversPath, {
      useRequire: true,
      requireMethod: async (path) => {
        return await import(path);
      },
    });
    return mergeResolvers(resolversArray);
  }
  const resolvers = await getResolvers();

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  const index = new ApolloServer({
    schema,
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

  app.disable('x-powered-by');

  //Apply express middleware
  app.use(
    '/graphql',
    cors<cors.CorsRequest>(corsOptions),
    json(),
    helmet(),
    expressMiddleware(index, {
      context: authMiddleware,
    })
  );

  const port: number = Number.parseInt(process.env.PORT) || 8000;

  await new Promise<void>((resolve) => httpServer.listen({ port: port }, resolve));
  console.log(`🚀 Server listening at: ${port}`);
}

initServer();
