import { ObjectId } from "mongodb";

enum PokemonType{
NORMAL,
FIRE,
WATER,
ELECTRIC,
GRASS,
ICE,
FIGHTING,
POISON,
GROUND,
FLYING,
PSYCHIC,
BUG,
ROCK,
GHOST,
DRAGON
}

export type Pokemon = {
  _id?: ObjectId;
  name: string;
  description: string;
  height: number;
  weight: number;
  types: PokemonType[];
};

export type OwnedPokemon = {
  _id?: ObjectId;
  pokemon: ObjectId;
  nickname?: string;
  attack: number;
  defense: number;
  speed: number;
  special: number;
  level: number;
};

export type Trainer = {
  _id?: ObjectId;
  name: string;
  password: string;
  pokemons: ObjectId[];
};

export type Context = {
  user: Trainer | null;
};