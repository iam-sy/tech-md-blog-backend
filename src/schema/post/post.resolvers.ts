import { GraphQLError } from "graphql";
import { PostORM } from "../../model/post";
import { authStateCheck } from "../../module/auth";
import { Equal } from "typeorm";

export default {
  Query: {
    // 리스트 정보 가져오기
    getPosts: async (_, { page = 1, size }, { dataSource }) => {
      const skip = size ? size * (page - 1) : page - 1;

      try {
        const posts = await dataSource.getRepository(PostORM).find({
          skip,
          take: size,
          order: {
            update: "DESC",
          },
        });
        return posts;
      } catch (e) {
        throw new GraphQLError("getPosts server error", {
          extensions: {
            code: "INTERNAL_SERVER_ERROR",
            http: { status: 500 },
          },
        });
      }
    },

    // 게시글 정보 가져오기
    getPost: async (_, { id }, { dataSource }) => {
      let postBody;
      try {
        postBody = await dataSource.getRepository(PostORM).findBy({
          id: id,
        });
      } catch (e) {
        throw new GraphQLError("getPost get server error", {
          extensions: {
            code: "INTERNAL_SERVER_ERROR",
            http: { status: 500 },
          },
        });
      }

      if (postBody.length === 0) {
        throw new GraphQLError("잘못된 id 입니다.", {
          extensions: {
            code: "INTERNAL_SERVER_ERROR",
            http: { status: 400 },
          },
        });
      }

      return postBody[0];
    },
  },

  Mutation: {
    // 등록
    registerPost: async (
      _,
      { id, title, content, tag, thumbnail },
      { dataSource, accessToken },
    ) => {
      const accessDecode = authStateCheck(accessToken);

      try {
        const post = new PostORM();
        post.title = title;
        post.content = content;
        post.tag = tag;
        post.writer = accessDecode.user_id;
        post.thumbnail = thumbnail;

        const writeContent = await dataSource.manager.save(post);

        return writeContent;
      } catch (e) {
        throw new GraphQLError("registerPost server error", {
          extensions: {
            code: "INTERNAL_SERVER_ERROR",
            http: { status: 500 },
          },
        });
      }
    },

    // 수정
    updatePost: async (
      _,
      { id, title, content, tag, thumbnail },
      { dataSource, accessToken },
    ) => {
      const accessDecode = authStateCheck(accessToken);
      let postBody;
      try {
        postBody = await dataSource.getRepository(PostORM).findBy({
          id: Equal(id),
        });
      } catch (e) {
        throw new GraphQLError("registerPost get server error", {
          extensions: {
            code: "INTERNAL_SERVER_ERROR",
            http: { status: 400 },
          },
        });
      }

      if (postBody.length === 0) {
        throw new GraphQLError("잘못된 id 입니다.", {
          extensions: {
            code: "INTERNAL_SERVER_ERROR",
            http: { status: 400 },
          },
        });
      }

      try {
        const post = new PostORM();
        post.title = title;
        post.content = content;
        post.tag = tag;
        post.writer = accessDecode.user_id;
        post.thumbnail = thumbnail;

        const writeContent = await dataSource.manager.save(post);
        return writeContent;
      } catch (e) {
        throw new GraphQLError("registerPost server error", {
          extensions: {
            code: "INTERNAL_SERVER_ERROR",
            http: { status: 500 },
          },
        });
      }
    },

    removePost: async (_, { id }, { accessToken, dataSource }) => {
      authStateCheck(accessToken);
      let postBody;

      try {
        postBody = await dataSource.getRepository(PostORM).findBy({
          id: id,
        });
      } catch (e) {
        throw new GraphQLError("removePost get server error ", {
          extensions: {
            code: "INTERNAL_SERVER_ERROR",
            http: { status: 400 },
          },
        });
      }

      if (postBody.length === 0) {
        throw new GraphQLError("잘못된 id 입니다.", {
          extensions: {
            code: "INTERNAL_SERVER_ERROR",
            http: { status: 400 },
          },
        });
      }
      try {
        await dataSource.getRepository(PostORM).delete({
          id: id,
        });

        return {
          status: true,
        };
      } catch (e) {
        throw new GraphQLError("removePost server error", {
          extensions: {
            code: "INTERNAL_SERVER_ERROR",
            http: { status: 400 },
          },
        });
      }
    },
  },
};
