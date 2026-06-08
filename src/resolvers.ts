import { IResolvers } from "@graphql-tools/utils";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { getDB } from "./db";
import { signToken } from "./auth";
import { Context, OwnedPokemon, Pokemon, Trainer } from "./types";

const COLLECTION_TRAINERS = "entrenadores";
const COLLECTION_POKEMONS = "pokemons";
const COLLECTION_OWNED_POKEMONS = "ownedPokemons";

const trainersCollection = () => getDB().collection<Trainer>(COLLECTION_TRAINERS);
const pokemonsCollection = () => getDB().collection<Pokemon>(COLLECTION_POKEMONS);
const ownedPokemonsCollection = () =>
  getDB().collection<OwnedPokemon>(COLLECTION_OWNED_POKEMONS);

const randomStat = () => {
  return Math.floor(Math.random() * 100) + 1;
};

const requireAuth = (user: Trainer | null) => {
  if (!user || !user._id) {
    throw new Error("No estás autenticado");
  }

  return user;
};

export const resolvers: IResolvers = {
  Query: {
    me: async (_: unknown, __: unknown, { user }: Context) => {
      if (!user || !user._id) return null;

      return await trainersCollection().findOne({
        _id: user._id,
      });
    },

    pokemons: async (
      _: unknown,
      { page, size }: { page?: number; size?: number }
    ) => {

      const localPage = page || 1;
      const localSize = size || 10;
      const skip = (localPage - 1) * localSize;

      return await pokemonsCollection()
        .find()
        .skip(skip)
        .limit(localSize)
        .toArray();
    },

    pokemon: async (_: unknown, { id }: { id: string }) => {
      if (!ObjectId.isValid(id)) return null;

      return await pokemonsCollection().findOne({
        _id: new ObjectId(id),
      });
    },
  },

  Mutation: {
    startJourney: async (
      _: unknown,
      { name, password }: { name: string; password: string }
    ) => {

      const existingTrainer = await trainersCollection().findOne({ name });

      if (existingTrainer) {
        throw new Error("Ya existe un entrenador con ese nombre");
      }

      const passwordHasheada = await bcrypt.hash(password, 10);

      const result = await trainersCollection().insertOne({
        name,
        password: passwordHasheada,
        pokemons: [],
      });

      return signToken(result.insertedId.toString());
    },

    login: async (
      _: unknown,
      { name, password }: { name: string; password: string }
    ) => {

      const trainer = await trainersCollection().findOne({ name });

      if (!trainer || !trainer._id) {
        throw new Error("Credenciales incorrectas");
      }

      const passwordCorrecta = await bcrypt.compare(password, trainer.password);

      if (!passwordCorrecta) {
        throw new Error("Credenciales incorrectas");
      }

      return signToken(trainer._id.toString());
    },

    createPokemon: async (
      _: unknown,
      {
        name,
        description,
        height,
        weight,
        types,
      }: {
        name: string;
        description: string;
        height: number;
        weight: number;
        types: Pokemon["types"];
      },
      { user }: Context
    ) => {
      requireAuth(user);

      const result = await pokemonsCollection().insertOne({
        name,
        description,
        height,
        weight,
        types,
      });

      const newPokemon = await pokemonsCollection().findOne({
        _id: result.insertedId,
      });

      if (!newPokemon) {
        throw new Error("Error creando Pokémon");
      }

      return newPokemon;
    },

    catchPokemon: async (
      _: unknown,
      { pokemonId, nickname }: { pokemonId: string; nickname?: string },
      { user }: Context
    ) => {
      const trainer = requireAuth(user);

      if (!trainer._id) {
        throw new Error("Entrenador inválido");
      }

      if (!ObjectId.isValid(pokemonId)) {
        throw new Error("ID de Pokémon inválido");
      }

      const pokemon = await pokemonsCollection().findOne({
        _id: new ObjectId(pokemonId),
      });

      if (!pokemon || !pokemon._id) {
        throw new Error("El Pokémon no existe");
      }

      const trainerActual = await trainersCollection().findOne({
        _id: trainer._id,
      });

      if (!trainerActual) {
        throw new Error("Entrenador no encontrado");
      }

      if (trainerActual.pokemons.length >= 6) {
        throw new Error("Un entrenador solo puede tener 6 Pokémon");
      }

      const nuevoOwnedPokemon: OwnedPokemon = {
        pokemon: pokemon._id,
        attack: randomStat(),
        defense: randomStat(),
        speed: randomStat(),
        special: randomStat(),
        level: randomStat(),
      };

      if (nickname) {
        nuevoOwnedPokemon.nickname = nickname;
      }

      const resultOwnedPokemon = await ownedPokemonsCollection().insertOne(
        nuevoOwnedPokemon
      );

      await trainersCollection().updateOne(
        { _id: trainer._id },
        {
          $push: {
            pokemons: resultOwnedPokemon.insertedId,
          },
        }
      );

      const ownedPokemon = await ownedPokemonsCollection().findOne({
        _id: resultOwnedPokemon.insertedId,
      });

      if (!ownedPokemon) {
        throw new Error("Error capturando Pokémon");
      }

      return ownedPokemon;
    },

    freePokemon: async (
      _: unknown,
      { ownedPokemonId }: { ownedPokemonId: string },
      { user }: Context
    ) => {
      const trainer = requireAuth(user);

      if (!trainer._id) {
        throw new Error("Entrenador inválido");
      }

      if (!ObjectId.isValid(ownedPokemonId)) {
        throw new Error("ID inválido");
      }

      const ownedPokemonObjectId = new ObjectId(ownedPokemonId);

      const trainerActual = await trainersCollection().findOne({
        _id: trainer._id,
      });

      if (!trainerActual) {
        throw new Error("Entrenador no encontrado");
      }

      const perteneceAlEntrenador = trainerActual.pokemons.some(
        (id) => id.toString() === ownedPokemonId
      );

      if (!perteneceAlEntrenador) {
        throw new Error("Ese Pokémon no pertenece al entrenador");
      }

      await trainersCollection().updateOne(
        { _id: trainer._id },
        {
          $pull: {
            pokemons: ownedPokemonObjectId,
          },
        }
      );


      await ownedPokemonsCollection().deleteOne({
        _id: ownedPokemonObjectId,
      });

      const trainerActualizado = await trainersCollection().findOne({
        _id: trainer._id,
      });

      if (!trainerActualizado) {
        throw new Error("Error liberando Pokémon");
      }



      return trainerActualizado;

    },
  },

  Trainer: {
    _id: (parent: Trainer) => {
      return parent._id?.toString();
    },

    pokemons: async (parent: Trainer) => {
      if (!parent.pokemons || parent.pokemons.length === 0) {
        return [];
      }




      return await ownedPokemonsCollection()
        .find({
          _id: {
            $in: parent.pokemons,
          },
        })
        .toArray();
    },
  },

  OwnedPokemon: {
    _id: (parent: OwnedPokemon) => {
      return parent._id?.toString();
    },

    pokemon: async (parent: OwnedPokemon) => {
      return await pokemonsCollection().findOne({
        _id: parent.pokemon,
      });
    },
  },

  Pokemon: {
    _id: (parent: Pokemon) => {
      return parent._id?.toString();
    },
  },
};