/**
 * This code was AUTOGENERATED using the codama library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun codama to update it.
 *
 * @see https://github.com/codama-idl/codama
 */

import {
  addDecoderSizePrefix,
  addEncoderSizePrefix,
  combineCodec,
  getAddressDecoder,
  getAddressEncoder,
  getI64Decoder,
  getI64Encoder,
  getStructDecoder,
  getStructEncoder,
  getU32Decoder,
  getU32Encoder,
  getUtf8Decoder,
  getUtf8Encoder,
  type Address,
  type Codec,
  type Decoder,
  type Encoder,
} from '@solana/kit';
import {
  getChannelVisibilityDecoder,
  getChannelVisibilityEncoder,
  type ChannelVisibility,
  type ChannelVisibilityArgs,
} from './channelVisibility';

export type ChannelCreated = {
  channel: Address;
  creator: Address;
  name: string;
  visibility: ChannelVisibility;
  timestamp: bigint;
};

export type ChannelCreatedArgs = {
  channel: Address;
  creator: Address;
  name: string;
  visibility: ChannelVisibilityArgs;
  timestamp: number | bigint;
};

export function getChannelCreatedEncoder(): Encoder<ChannelCreatedArgs> {
  return getStructEncoder([
    ['channel', getAddressEncoder()],
    ['creator', getAddressEncoder()],
    ['name', addEncoderSizePrefix(getUtf8Encoder(), getU32Encoder())],
    ['visibility', getChannelVisibilityEncoder()],
    ['timestamp', getI64Encoder()],
  ]);
}

export function getChannelCreatedDecoder(): Decoder<ChannelCreated> {
  return getStructDecoder([
    ['channel', getAddressDecoder()],
    ['creator', getAddressDecoder()],
    ['name', addDecoderSizePrefix(getUtf8Decoder(), getU32Decoder())],
    ['visibility', getChannelVisibilityDecoder()],
    ['timestamp', getI64Decoder()],
  ]);
}

export function getChannelCreatedCodec(): Codec<
  ChannelCreatedArgs,
  ChannelCreated
> {
  return combineCodec(getChannelCreatedEncoder(), getChannelCreatedDecoder());
}
