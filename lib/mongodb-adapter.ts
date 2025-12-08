import type { Adapter, AdapterUser, AdapterAccount } from "next-auth/adapters";
import { ObjectId } from "mongodb";
import { getGFWLDatabase } from "./mongodb";

export function MongoDBAdapter(): Adapter {
  return {
    async createUser(user: Omit<AdapterUser, "id">) {
      const db = await getGFWLDatabase();
      const usersCollection = db.collection("users");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newUser: any = {
        ...user,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await usersCollection.insertOne(newUser);
      return {
        ...user,
        id: result.insertedId.toString(),
      } as AdapterUser;
    },

    async getUser(id: string) {
      const db = await getGFWLDatabase();
      const usersCollection = db.collection("users");

      const user = await usersCollection.findOne({ _id: new ObjectId(id) });
      if (!user) return null;

      return {
        id: user._id.toString(),
        email: user.email,
        emailVerified: user.emailVerified,
        name: user.name,
        image: user.image,
      } as AdapterUser;
    },

    async getUserByEmail(email: string) {
      const db = await getGFWLDatabase();
      const usersCollection = db.collection("users");

      const user = await usersCollection.findOne({ email });
      if (!user) return null;

      return {
        id: user._id.toString(),
        email: user.email,
        emailVerified: user.emailVerified,
        name: user.name,
        image: user.image,
      } as AdapterUser;
    },

    async getUserByAccount({
      providerAccountId,
      provider,
    }: {
      providerAccountId: string;
      provider: string;
    }) {
      const db = await getGFWLDatabase();
      const usersCollection = db.collection("users");

      // Check both new structure (providerInfo) and old structure (separate fields)
      const user = await usersCollection.findOne({
        $or: [
          {
            "providerInfo.provider": provider,
            "providerInfo.providerAccountId": providerAccountId,
          },
          {
            provider: provider,
            providerAccountId: providerAccountId,
          },
        ],
      });
      if (!user) return null;

      return {
        id: user._id.toString(),
        email: user.email,
        emailVerified: user.emailVerified,
        name: user.name,
        image: user.image,
      } as AdapterUser;
    },

    async updateUser(user: Partial<AdapterUser> & Pick<AdapterUser, "id">) {
      const db = await getGFWLDatabase();
      const usersCollection = db.collection("users");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        ...user,
        updatedAt: new Date(),
      };
      delete updateData.id;

      await usersCollection.updateOne(
        { _id: new ObjectId(user.id) },
        { $set: updateData }
      );

      const updated = await usersCollection.findOne({
        _id: new ObjectId(user.id),
      });
      if (!updated) throw new Error("User not found after update");

      return {
        id: updated._id.toString(),
        email: updated.email,
        emailVerified: updated.emailVerified,
        name: updated.name,
        image: updated.image,
      } as AdapterUser;
    },

    async linkAccount(account: AdapterAccount) {
      // Store provider info as a single object in user document
      const db = await getGFWLDatabase();
      const usersCollection = db.collection("users");

      await usersCollection.updateOne(
        { _id: new ObjectId(account.userId) },
        {
          $set: {
            providerInfo: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              type: account.type,
            },
            updatedAt: new Date(),
          },
        }
      );

      return account;
    },

    async unlinkAccount({
      providerAccountId,
      provider,
    }: {
      providerAccountId: string;
      provider: string;
    }) {
      // Remove provider info from user document
      const db = await getGFWLDatabase();
      const usersCollection = db.collection("users");

      await usersCollection.updateOne(
        {
          "providerInfo.provider": provider,
          "providerInfo.providerAccountId": providerAccountId,
        },
        {
          $unset: {
            providerInfo: "",
          },
          $set: {
            updatedAt: new Date(),
          },
        }
      );
    },

    // Session methods - not needed with JWT strategy, but required by Adapter interface
    async createSession() {
      throw new Error("Sessions not supported - using JWT strategy");
    },

    async getSessionAndUser() {
      throw new Error("Sessions not supported - using JWT strategy");
    },

    async updateSession() {
      throw new Error("Sessions not supported - using JWT strategy");
    },

    async deleteSession() {
      throw new Error("Sessions not supported - using JWT strategy");
    },

    async createVerificationToken() {
      throw new Error("Verification tokens not implemented");
    },

    async useVerificationToken() {
      throw new Error("Verification tokens not implemented");
    },
  };
}
