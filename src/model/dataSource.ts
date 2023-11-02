import 'reflect-metadata';
import dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { UserORM } from './user.js';
import { PostORM } from './post.js';

dotenv.config();

export const AppDataSource = new DataSource({
  //url: process.env.DATABASE_URL || DATABASE_URL,
  type: 'postgres',
  host: process.env.APP_PGHOST,
  port: parseInt(process.env.APP_PGPORT),
  username: process.env.APP_PGUSER,
  password: process.env.APP_PGPASSWORD,
  database: process.env.APP_PGDATABASE,
  synchronize: false,
  logging: true,
  entities: [UserORM, PostORM],
});
